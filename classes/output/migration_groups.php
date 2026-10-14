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
 * Format bounded operation groups and their whole-plan folder/course selection counts.
 */
final class migration_groups {
    /**
     * Data.
     *
     * @param int $planid Planid.
     * @param string $condition Condition.
     * @param array $params Params.
     * @param int $page Page.
     * @param int $perpage Perpage.
     * @param bool $editable Editable.
     * @return array Result.
     */
    public static function data(
        int $planid,
        string $condition,
        array $params,
        int $page,
        int $perpage,
        bool $editable
    ): array {
        global $DB;
        $courses = [];
        $groups = [];
        foreach (
            $DB->get_records_select(
                'local_filebank_operation',
                $condition,
                $params,
                'targetcmid, id',
                '*',
                $page * $perpage,
                $perpage
            ) as $operation
        ) {
            self::operation($operation, $editable, $courses, $groups);
        }
        $groups = array_values($groups);
        return [$groups, self::courses($planid, $groups)];
    }

    /**
     * Operation.
     *
     * @param \stdClass $operation Operation.
     * @param bool $editable Editable.
     * @param array $courses Courses.
     * @param array $groups Groups.
     */
    private static function operation(\stdClass $operation, bool $editable, array &$courses, array &$groups): void {

        global $DB, $OUTPUT;
        $snapshot = json_decode($operation->snapshot, true);
        $target = $snapshot['target'];
        foreach ([$snapshot['sourcecourse'], $target['courseid']] as $courseid) {
            $courses[$courseid] = $courses[$courseid] ?? ($DB->get_field('course', 'shortname', ['id' => $courseid])
                ?: get_string('unknowncourse', 'local_filebank'));
        }
        $targetkey = $operation->targetcmid ?: ($snapshot['targetkey'] ?? '');
        $key = $snapshot['sourcecourse'] . ':' . $operation->sourcecmid . ':' . $targetkey;
        if (!isset($groups[$key])) {
            $groups[$key] = self::group($operation, $snapshot, $target, $courses);
        }
        $result = json_decode($operation->result, true);
        $groups[$key]['operations'][] = ['id' => $operation->id, 'included' => (bool)$operation->included,
            'resolvable' => $editable && $operation->decision === 'blocked_content',
            'resolutionhelp' => $OUTPUT->help_icon('conflictpolicy', 'local_filebank'),
            'filename' => $snapshot['source']['filename'],
            'sourcecourseid' => $operation->sourcecourseid, 'sourcecmid' => $operation->sourcecmid,
            'filepath' => $snapshot['source']['filepath'],
            'author' => $snapshot['source']['author'] ?: get_string('unknownauthor', 'local_filebank'),
            'license' => $snapshot['source']['license'], 'decisionlabel' => display::outcome($operation->decision),
            'statelabel' => display::outcome($operation->state),
            'resultlabel' => isset($result['error']) ? display::reason($result['error'])
                : (!empty($result['outcome']) ? display::outcome($result['outcome']) : '')];
    }

    /**
     * Courses.
     *
     * @param int $planid Planid.
     * @param array $groups Groups.
     * @return array Result.
     */
    private static function courses(int $planid, array $groups): array {
        $counts = self::counts($planid);
        $coursegroups = [];
        foreach ($groups as $group) {
            [$grouptotal, $groupincluded] = $counts['folders'][$group['groupcourseid'] . ':' . $group['groupcmid']] ?? [0, 0];
            $group['grouptotal'] = $grouptotal;
            $group['groupincluded'] = $groupincluded;
            $group['groupchecked'] = $grouptotal > 0 && $groupincluded === $grouptotal;
            $group['grouppartial'] = $groupincluded > 0 && !$group['groupchecked'];
            $key = $group['groupcourseid'] . ':' . $group['targetcourse'];
            if (!isset($coursegroups[$key])) {
                [$total, $included] = $counts['courses'][$group['groupcourseid']] ?? [0, 0];
                $coursegroups[$key] = $group;
                $coursegroups[$key]['folders'] = [];
                $coursegroups[$key]['coursetotal'] = $total;
                $coursegroups[$key]['courseincluded'] = $included;
                $coursegroups[$key]['coursechecked'] = $total > 0 && $total === $included;
                $coursegroups[$key]['coursepartial'] = $included > 0 && $included < $total;
            }
            $coursegroups[$key]['folders'][] = $group;
        }
        return array_values($coursegroups);
    }

    /**
     * How many operations each source folder and each source course of a plan has, and how many of them are included.
     *
     * @param int $planid Plan.
     * @return array The [total, included] pairs of the folders, by course and folder, and of the courses, by course.
     */
    private static function counts(int $planid): array {
        global $DB;
        $rows = $DB->get_records_sql(
            'SELECT MIN(id) AS id, sourcecourseid, sourcecmid, COUNT(1) AS total, SUM(included) AS included
               FROM {local_filebank_operation}
              WHERE planid = :planid
           GROUP BY sourcecourseid, sourcecmid',
            ['planid' => $planid]
        );
        $counts = ['folders' => [], 'courses' => []];
        foreach ($rows as $row) {
            $pair = [(int)$row->total, (int)$row->included];
            $counts['folders'][$row->sourcecourseid . ':' . $row->sourcecmid] = $pair;
            $course = $counts['courses'][$row->sourcecourseid] ?? [0, 0];
            $counts['courses'][$row->sourcecourseid] = [$course[0] + $pair[0], $course[1] + $pair[1]];
        }
        return $counts;
    }

    /**
     * Group.
     *
     * @param \stdClass $operation Operation.
     * @param array $snapshot Snapshot.
     * @param array $target Target.
     * @param array $courses Courses.
     * @return array Result.
     */
    private static function group(\stdClass $operation, array $snapshot, array $target, array $courses): array {
        $group = ['sourcecourse' => $courses[$snapshot['sourcecourse']],
            'targetcourse' => $courses[$target['courseid']], 'targetfolder' => $target['name'],
            'targetsection' => $target['sectionname'] ?: get_string(
                'sectionnumber',
                'local_filebank',
                $target['sectionnum']
            ), 'operations' => [], 'groupcourseid' => $operation->sourcecourseid, 'groupcmid' => $operation->sourcecmid];
        $sourcecontext = \context_course::instance($snapshot['sourcecourse'], IGNORE_MISSING)
            ?: \context_system::instance();
        $targetcontext = \context_course::instance($target['courseid'], IGNORE_MISSING) ?: \context_system::instance();
        $foldercontext = \context_module::instance($operation->targetcmid, IGNORE_MISSING) ?: $targetcontext;
        $group += [
            'sourcecoursehtml' => display::name($courses[$snapshot['sourcecourse']], $sourcecontext),
            'targetcoursehtml' => display::name($courses[$target['courseid']], $targetcontext),
            'targetfolderhtml' => display::name($target['name'], $foldercontext),
            'sourcefolderhtml' => display::name($snapshot['sourcefoldername'] ?? '', $sourcecontext),
            'targetsectionhtml' => display::name($group['targetsection'], $targetcontext),
        ];
        return $group;
    }
}
