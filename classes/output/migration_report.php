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
 * Paged migration review presentation.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_filebank\output;

/**
 * Groups a bounded result page while retaining whole-plan counts and permissions.
 */
final class migration_report {
    /**
     * Export an immutable stored plan without loading every operation.
     *
     * @param int $planid Stored preview.
     * @param string $decision Decision group.
     * @param int $page Zero-based page.
     * @param string $search Course, folder or filename search.
     * @param string $stage Review or execute stage.
     * @param int $issuepage Independent zero-based course/placement issue page.
     * @param int $perpage Bounded page size.
     * @return array Template context.
     */
    public static function data(
        int $planid,
        string $decision = '',
        int $page = 0,
        string $search = '',
        string $stage = 'review',
        int $issuepage = 0,
        int $perpage = 50
    ): array {

        global $DB;
        $execution = $stage === 'execute';
        require_capability('local/filebank:planmigration', \context_system::instance());
        if (!in_array($decision, ['', 'copy', 'skip', 'blocked'], true)) {
            throw new \invalid_parameter_exception('Unknown decision filter');
        }
        $plan = $DB->get_record('local_filebank_plan', ['id' => $planid], '*', MUST_EXIST);
        $document = json_decode($plan->configjson, true);
        $revision = $DB->get_record('local_filebank_revision', ['id' => $plan->revisionid], '*', MUST_EXIST);
        $config = json_decode($revision->configjson, true);
        $config['migration'] = $document['migration'] ?? $config['migration'] ?? [];
        $perpage = in_array($perpage, [10, 25, 50], true) ? $perpage : 50;
        $url = new \moodle_url('/local/filebank/admin/migration_review.php', ['planid' => $planid, 'perpage' => $perpage]);
        $data = self::header($plan, $document, $revision, $config, $url, $execution, $search, $perpage);
        $totals = self::totals($planid);
        $counts = $totals['counts'];
        $total = $totals['total'];
        $includedtotal = $totals['includedtotal'];
        $completed = $totals['completed'];
        $data['total'] = $total;
        foreach ($counts as $key => $count) {
            $data['metrics'][] = ['count' => $count, 'label' => get_string('metric_' . $key, 'local_filebank')];
        }
        foreach (['' => $total] + $counts as $key => $count) {
            $data['filters'][] = ['label' => get_string($key === '' ? 'allfiles' : 'metric_' . $key, 'local_filebank'),
                'count' => $count, 'active' => $decision === $key, 'current' => $decision === $key ? 'page' : '',
                'url' => (new \moodle_url($url, ['decision' => $key, 'q' => $search]))->out(false)];
        }
        [$condition, $params] = self::query($planid, $decision, $search);
        $filtered = $DB->count_records_select('local_filebank_operation', $condition, $params);
        $data['included'] = $DB->count_records('local_filebank_operation', ['planid' => $planid, 'included' => 1]);
        $data['includedlabel'] = get_string('includedcount', 'local_filebank', $data['included']);
        $data['editable'] = $data['selectioneditable'];
        $data['page'] = $page;
        $data['decision'] = $decision;
        $page = pagination::clamp($filtered, $page, $perpage);
        $data['page'] = $page;
        [$data['groups'], $data['courses']] = migration_groups::data(
            $planid,
            $condition,
            $params,
            $page,
            $perpage,
            $data['selectioneditable']
        );
        $issuecount = count($document['issues']);
        $issuepage = pagination::clamp($issuecount, $issuepage, $perpage);
        $data['issuepage'] = $issuepage;
        $data['issuepageinfo'] = get_string(
            'reviewissuepage',
            'local_filebank',
            (object)[
                'page' => $issuepage + 1, 'pages' => max(1, (int)ceil($issuecount / $perpage)), 'total' => $issuecount,
            ]
        );
        $data['issues'] = migration_issues::data($document, $issuepage, $perpage, $data['selectioneditable']);
        $data = array_replace($data, self::runs($plan));
        migration_progress::apply(
            $data,
            $url,
            compact(
                'issuecount',
                'issuepage',
                'perpage',
                'decision',
                'page',
                'search',
                'execution',
                'completed',
                'includedtotal',
                'filtered'
            )
        );
        return $data;
    }

    /**
     * Totals.
     *
     * @param int $planid Planid.
     * @return array Result.
     */
    private static function totals(int $planid): array {
        global $DB;
        $counts = ['copy' => 0, 'skip' => 0, 'blocked' => 0];
        $total = 0;
        $includedtotal = 0;
        $completed = 0;
        $totals = $DB->get_recordset_sql(
            'SELECT decision, state, included, COUNT(1) AS amount FROM {local_filebank_operation}
              WHERE planid = ? GROUP BY decision, state, included',
            [$planid]
        );
        foreach ($totals as $row) {
            $category = in_array($row->decision, ['copy', 'overwrite'], true) ? 'copy'
                : (str_starts_with($row->decision, 'skip_') ? 'skip' : 'blocked');
            $counts[$category] += (int)$row->amount;
            $total += (int)$row->amount;
            $includedtotal += $row->included ? (int)$row->amount : 0;
            $completed += $row->included && $row->state !== 'pending' ? (int)$row->amount : 0;
        }
        $totals->close();
        return compact('counts', 'total', 'includedtotal', 'completed');
    }

    /**
     * Query.
     *
     * @param int $planid Planid.
     * @param string $decision Decision.
     * @param string $search Search.
     * @return array Result.
     */
    private static function query(int $planid, string $decision, string $search): array {
        global $DB;
        $condition = 'planid = :planid';
        $params = ['planid' => $planid];
        if ($decision === 'copy') {
            $condition .= ' AND (decision = :copydecision OR decision = :overwritedecision)';
            $params['copydecision'] = 'copy';
            $params['overwritedecision'] = 'overwrite';
        } else if ($decision !== '') {
            $condition .= ' AND ' . $DB->sql_like('decision', ':decision');
            $params['decision'] = $DB->sql_like_escape($decision . '_') . '%';
        }
        if ($search !== '') {
            // Cross-database text search covers immutable file/folder snapshots and current course shortnames.
            $condition .= ' AND (' . $DB->sql_like('snapshot', ':snapshotsearch', false)
                . ' OR EXISTS (SELECT 1 FROM {course_modules} cm JOIN {course} c ON c.id = cm.course WHERE cm.id = targetcmid AND '
                . $DB->sql_like('c.shortname', ':coursesearch', false) . '))';
            $params['snapshotsearch'] = '%' . $DB->sql_like_escape($search) . '%';
            $params['coursesearch'] = $params['snapshotsearch'];
        }
        return [$condition, $params];
    }

    /**
     * Runs.
     *
     * @param \stdClass $plan Plan.
     * @return array Result.
     */
    private static function runs(\stdClass $plan): array {
        global $DB;
        $data = ['runs' => []];
        $canexecute = has_capability('local/filebank:executemigration', \context_system::instance());
        $data['canexecute'] = $plan->state === 'reviewable' && $canexecute
            && $DB->record_exists('local_filebank_operation', ['planid' => $plan->id, 'included' => 1, 'state' => 'pending']);
        foreach ($DB->get_records('local_filebank_run', ['planid' => $plan->id], 'id DESC') as $run) {
            $active = in_array($run->state, ['queued', 'running'], true);
            $data['runs'][] = ['id' => $run->id, 'statelabel' => display::outcome($run->state),
                'cancancel' => $canexecute && $active];
            if ($active) {
                $data['canexecute'] = false;
            }
        }
        return $data;
    }

    /**
     * Export native plan navigation, profile summary and permission-controlled review actions.
     *
     * @param \stdClass $plan Plan.
     * @param array $document Document.
     * @param \stdClass $revision Revision.
     * @param array $config Config.
     * @param \moodle_url $url Url.
     * @param bool $execution Execution.
     * @param string $search Search.
     * @param int $perpage Perpage.
     * @return array Result.
     */
    private static function header(
        \stdClass $plan,
        array $document,
        \stdClass $revision,
        array $config,
        \moodle_url $url,
        bool $execution,
        string $search,
        int $perpage
    ): array {
        global $DB, $OUTPUT;
        $planid = (int)$plan->id;
        $data = ['planid' => $planid, 'uuid' => $plan->uuid, 'planstate' => display::outcome($plan->state),
            'sourceedition' => $document['sourceedition'], 'targetedition' => $document['targetedition'],
            'executionstep' => $execution, 'reviewstep' => !$execution, 'search' => $search,
            'selectioneditable' => !$DB->record_exists('local_filebank_run', ['planid' => $planid]),
            'reviewurl' => $url->out(false), 'executionurl' => (new \moodle_url($url, ['step' => 'execute']))->out(false),
            'summary' => profile_summary::data($config, true) + ['revision' => $revision->revision],
            'actionurl' => $url->out(false), 'sesskey' => sesskey(), 'digest' => $plan->digest, 'perpage' => $perpage,
            'contextid' => \context_system::instance()->id,
            'selectionhelp' => $OUTPUT->help_icon('reviewselection', 'local_filebank'),
            'searchhelp' => $OUTPUT->help_icon('migrationsearch', 'local_filebank'),
            'executionhelp' => $OUTPUT->help_icon('confirmmigration', 'local_filebank'),
            'issues' => [], 'runs' => [], 'groups' => [], 'filters' => [],
            'newplanurl' => (new \moodle_url(
                '/local/filebank/admin/migration.php',
                ['fromplan' => $plan->id, 'profileid' => $plan->profileid, 'sourceedition' => $document['sourceedition'],
                'targetedition' => $document['targetedition'], 'scopekey' => $document['scopekey'] ?? 'edition', 'step' => 'scope']
            ))->out(false),
            'blocked' => $plan->state === 'blocked',
            'emptycancelled' => $plan->state === 'cancelled' && !\local_filebank\local\migration\plan_history::has_work($planid),
            'refreshurl' => $url->out(false),
        ];
        return $data;
    }
}
