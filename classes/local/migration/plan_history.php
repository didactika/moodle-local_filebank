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
 * Explicit migration history removal and empty-plan classification.
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_filebank\local\migration;

/**
 * Removes inactive plan records without touching native material or attribution.
 */
final class plan_history {
    /**
     * Remove a reviewed, bounded selection atomically with respect to all selected queues.
     * @param array $ids Explicit plan IDs.
     */
    public static function delete_many(array $ids): void {

        global $DB;
        require_capability('local/filebank:planmigration', \context_system::instance());
        $ids = array_values(array_unique(array_map('intval', $ids)));
        sort($ids);
        if (!$ids || count($ids) > 50 || min($ids) < 1) {
            throw new \invalid_parameter_exception('Invalid migration selection');
        }
        $locks = [];
        try {
            foreach ($ids as $id) {
                $lock = \core\lock\lock_config::get_lock_factory('local_filebank')->get_lock('plan:' . $id, 10);
                if (!$lock) {
                    throw new \moodle_exception('lockfailed', 'local_filebank');
                }
                $locks[] = $lock;
            }
            self::require_removable($ids);
            $transaction = $DB->start_delegated_transaction();
            foreach ($ids as $id) {
                self::remove_plan($id);
            }
            $transaction->allow_commit();
        } finally {
            foreach (array_reverse($locks) as $lock) {
                $lock->release();
            }
        }
    }

    /**
     * Require that every plan exists and that none of them is queued or running.
     *
     * @param int[] $ids Plans.
     */
    private static function require_removable(array $ids): void {
        global $DB;
        [$insql, $params] = $DB->get_in_or_equal($ids, SQL_PARAMS_NAMED, 'plan');
        if (
            $DB->record_exists_select(
                'local_filebank_run',
                'planid ' . $insql . ' AND (state = :queued OR state = :running)',
                $params + ['queued' => 'queued', 'running' => 'running']
            )
        ) {
            throw new \moodle_exception('migrationinuse', 'local_filebank');
        }
        if ($DB->count_records_select('local_filebank_plan', 'id ' . $insql, $params) !== count($ids)) {
            throw new \dml_missing_record_exception('local_filebank_plan');
        }
    }

    /**
     * Delete an inactive plan under the same lock used to queue execution.
     * @param int $planid Stored plan.
     */
    public static function delete(int $planid): void {
        self::delete_many([$planid]);
    }

    /**
     * Whether an included operation can actually write material.
     * @param int $planid Plan.
     * @return bool At least one pending copy or overwrite.
     */
    public static function has_work(int $planid): bool {
        global $DB;
        return $DB->record_exists_select(
            'local_filebank_operation',
            'planid = ? AND included = 1 AND state = ? AND (decision = ? OR decision = ?)',
            [$planid, 'pending', 'copy', 'overwrite']
        );
    }

    /**
     * Remove plan.
     *
     * @param int $id Id.
     */
    private static function remove_plan(int $id): void {
        global $DB;
        $plan = $DB->get_record('local_filebank_plan', ['id' => $id], '*', MUST_EXIST);
        foreach (
            ['local_filebank_target', 'local_filebank_operation', 'local_filebank_run',
            'local_filebank_plan'] as $table
        ) {
            $DB->delete_records($table, [$table === 'local_filebank_plan' ? 'id' : 'planid' => $id]);
        }
        \local_filebank\local\logging\log::record('migration_deleted', $plan->uuid, []);
    }
}
