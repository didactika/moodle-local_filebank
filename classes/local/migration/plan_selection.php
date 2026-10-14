<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Persistent reviewed migration inclusions independent of result pagination.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_filebank\local\migration;

/**
 * Serializes selection changes with queueing and invalidates older approvals.
 */
final class plan_selection {
    /**
     * Return only changed selection state, not file snapshots or a replacement review.
     * @param int $planid Stored plan.
     * @param array $visible Bounded visible operation IDs.
     * @return array Canonical checks, counts, approval and continuation state.
     */
    public static function state(int $planid, array $visible): array {

        global $DB;
        require_capability('local/filebank:planmigration', \context_system::instance());
        if (count($visible) > 50) {
            throw new \invalid_parameter_exception('Too many visible operations');
        }
        $plan = $DB->get_record('local_filebank_plan', ['id' => $planid], '*', MUST_EXIST);
        $records = $visible ? $DB->get_records_list(
            'local_filebank_operation',
            'id',
            $visible,
            'id',
            'id, planid, included, sourcecourseid, sourcecmid'
        ) : [];
        $checks = [];
        foreach ($records as $record) {
            if ((int)$record->planid !== $planid) {
                throw new \invalid_parameter_exception('Operation belongs to another migration');
            }
            $checks[] = ['id' => (int)$record->id, 'included' => (bool)$record->included];
        }
        $groups = self::groups($planid, $records);
        $total = $DB->count_records('local_filebank_operation', ['planid' => $planid]);
        $included = $DB->count_records('local_filebank_operation', ['planid' => $planid, 'included' => 1]);
        return ['digest' => $plan->digest, 'checks' => $checks, 'groups' => $groups, 'total' => $total, 'included' => $included,
            'emptycancelled' => $plan->state === 'cancelled' && !plan_history::has_work($planid),
            'includedlabel' => get_string('includedcount', 'local_filebank', $included),
            'planstate' => \local_filebank\output\display::outcome($plan->state),
            'cancontinue' => $plan->state === 'reviewable' && plan_history::has_work($planid)
                && !$DB->record_exists('local_filebank_run', ['planid' => $planid])
                && has_capability('local/filebank:executemigration', \context_system::instance())];
    }

    /**
     * Save at most one rendered page or an explicit whole-plan action.
     *
     * @param int $planid Stored plan.
     * @param string $digest Rendered approval.
     * @param array $visible IDs represented on this page.
     * @param array $included Checked IDs from that page.
     * @param string $action page, all, none or group.
     * @param array $group Explicit source course/folder and inclusion.
     */
    public static function save(
        int $planid,
        string $digest,
        array $visible,
        array $included,
        string $action = 'page',
        array $group = []
    ): void {

        global $DB;
        require_capability('local/filebank:planmigration', \context_system::instance());
        $visible = array_values(array_unique(array_map('intval', $visible)));
        $included = array_values(array_unique(array_map('intval', $included)));
        self::require_request($visible, $included, $action);
        $lock = \core\lock\lock_config::get_lock_factory('local_filebank')->get_lock('plan:' . $planid, 10);
        if (!$lock) {
            throw new \moodle_exception('lockfailed', 'local_filebank');
        }
        try {
            $plan = $DB->get_record('local_filebank_plan', ['id' => $planid], '*', MUST_EXIST);
            if (
                !hash_equals($plan->digest, $digest) || !hash_equals($digest, hash('sha256', $plan->configjson))
                    || $DB->record_exists('local_filebank_run', ['planid' => $planid])
            ) {
                throw new \moodle_exception('planstale', 'local_filebank');
            }
            $transaction = $DB->start_delegated_transaction();
            self::update($planid, $visible, $included, $action, $group);
            $document = json_decode($plan->configjson, true);
            $document['selectiondigest'] = self::digest($planid);
            $plan->configjson = json_encode($document, JSON_UNESCAPED_SLASHES);
            $plan->digest = hash('sha256', $plan->configjson);
            $blocked = $DB->record_exists_select(
                'local_filebank_operation',
                'planid = ? AND included = 1 AND ' . $DB->sql_like('decision', '?'),
                [$planid, 'blocked%']
            );
            $issues = array_filter($document['issues'] ?? [], static fn($issue) => $issue['blocking'] ?? true);
            $plan->state = $issues || $blocked ? 'blocked' : (plan_history::has_work($planid) ? 'reviewable' : 'cancelled');
            $DB->update_record('local_filebank_plan', $plan);
            \local_filebank\local\logging\log::record(
                'migration_selection_changed',
                $plan->uuid,
                ['included' => $DB->count_records('local_filebank_operation', ['planid' => $planid, 'included' => 1])]
            );
            $transaction->allow_commit();
        } finally {
            $lock->release();
        }
    }

    /**
     * Hash inclusions without loading the complete operation list into memory.
     *
     * @param int $planid Plan.
     * @return string Current selection digest.
     */
    public static function digest(int $planid): string {
        global $DB;
        $hash = hash_init('sha256');
        $records = $DB->get_recordset('local_filebank_operation', ['planid' => $planid], 'id', 'id, included');
        foreach ($records as $record) {
            hash_update($hash, $record->id . ':' . $record->included . ';');
        }
        $records->close();
        return hash_final($hash);
    }

    /**
     * Fingerprint stored source/destination decisions without duplicating every snapshot in the plan document.
     *
     * @param int $planid Plan.
     * @return string Immutable operation digest.
     */
    public static function manifest_digest(int $planid): string {
        global $DB;
        $hash = hash_init('sha256');
        $records = $DB->get_recordset(
            'local_filebank_operation',
            ['planid' => $planid],
            'id',
            'id, opkey, sourcehash, targetcmid, decision, snapshot'
        );
        foreach ($records as $record) {
            hash_update(
                $hash,
                json_encode(
                    [$record->opkey, $record->sourcehash, $record->targetcmid,
                        $record->decision, $record->snapshot]
                ) . "\n"
            );
        }
        $records->close();
        return hash_final($hash);
    }

    /**
     * Groups.
     *
     * @param int $planid Planid.
     * @param array $records Records.
     * @return array Result.
     */
    private static function groups(int $planid, array $records): array {
        global $DB;
        $courses = array_unique(array_column($records, 'sourcecourseid'));
        $groups = [];
        $coursetotals = [];
        if ($courses) {
            [$insql, $params] = $DB->get_in_or_equal($courses, SQL_PARAMS_NAMED, 'course');
            $params['planid'] = $planid;
            foreach (
                $DB->get_records_sql(
                    'SELECT MIN(id) AS id, sourcecourseid, sourcecmid,
                    COUNT(1) AS total, SUM(included) AS included FROM {local_filebank_operation}
                    WHERE planid = :planid AND sourcecourseid ' . $insql . ' GROUP BY sourcecourseid, sourcecmid',
                    $params
                ) as $record
            ) {
                $course = (int)$record->sourcecourseid;
                $groups[] = ['courseid' => $course, 'cmid' => (int)$record->sourcecmid,
                    'total' => (int)$record->total, 'included' => (int)$record->included];
                $coursetotals[$course]['total'] = ($coursetotals[$course]['total'] ?? 0) + (int)$record->total;
                $coursetotals[$course]['included'] = ($coursetotals[$course]['included'] ?? 0) + (int)$record->included;
            }
        }
        foreach ($coursetotals as $id => $counts) {
            $groups[] = ['courseid' => $id, 'cmid' => 0] + $counts;
        }
        return $groups;
    }

    /**
     * Update.
     *
     * @param int $planid Planid.
     * @param array $visible Visible.
     * @param array $included Included.
     * @param string $action Action.
     * @param array $group Group.
     */
    private static function update(int $planid, array $visible, array $included, string $action, array $group): void {
        global $DB;
        if ($action === 'group') {
            self::page($planid, $visible, $included);
            $conditions = ['planid' => $planid, 'sourcecourseid' => (int)($group['courseid'] ?? 0)];
            if (!empty($group['cmid'])) {
                $conditions['sourcecmid'] = (int)$group['cmid'];
            }
            if (
                !$conditions['sourcecourseid'] || !in_array($group['included'] ?? null, [0, 1], true)
                || !$DB->record_exists('local_filebank_operation', $conditions)
            ) {
                throw new \invalid_parameter_exception('Invalid migration group');
            }
            $DB->set_field('local_filebank_operation', 'included', $group['included'], $conditions);
        } else if ($action !== 'page') {
            $DB->set_field('local_filebank_operation', 'included', $action === 'all' ? 1 : 0, ['planid' => $planid]);
        } else {
            self::page($planid, $visible, $included);
        }
    }

    /**
     * Page.
     *
     * @param int $planid Planid.
     * @param array $visible Visible.
     * @param array $included Included.
     */
    private static function page(int $planid, array $visible, array $included): void {
        global $DB;
        $visible = array_values(array_unique(array_map('intval', $visible)));
        if (!$visible) {
            return;
        }
        [$insql, $params] = $DB->get_in_or_equal($visible, SQL_PARAMS_NAMED, 'visible');
        $found = $DB->count_records_select(
            'local_filebank_operation',
            'planid = :planid AND id ' . $insql,
            $params + ['planid' => $planid]
        );
        if ($found !== count($visible)) {
            throw new \dml_missing_record_exception('local_filebank_operation');
        }
        $included = array_map('intval', $included);
        foreach ([1 => array_intersect($visible, $included), 0 => array_diff($visible, $included)] as $value => $ids) {
            if ($ids) {
                [$insql, $params] = $DB->get_in_or_equal(array_values($ids), SQL_PARAMS_NAMED, 'chosen');
                $DB->set_field_select('local_filebank_operation', 'included', $value, 'id ' . $insql, $params);
            }
        }
    }

    /**
     * Require request.
     *
     * @param array $visible Visible.
     * @param array $included Included.
     * @param string $action Action.
     */
    private static function require_request(array $visible, array $included, string $action): void {
        if (!in_array($action, ['page', 'all', 'none', 'group'], true) || count($visible) > 50 || array_diff($included, $visible)) {
            throw new \invalid_parameter_exception('Invalid migration selection');
        }
    }
}
