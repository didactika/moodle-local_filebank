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
 * Configurable unique course section and folder placement.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_filebank\local\migration;

use local_filebank\local\profile\profile_config;
use local_filebank\local\policy\author_policy;

/**
 * Selects exact destinations without guessing across course-local IDs.
 */
final class placement {
    /**
     * Test a module predicate and return named captures.
     *
     * @param \cm_info $cm Module.
     * @param array $predicate Type and name/idnumber predicate.
     * @param array $captures Source captures for destination templates.
     * @return array|null Captures or no match.
     */
    public static function match(\cm_info $cm, array $predicate, array $captures = []): ?array {

        if ($cm->modname !== ($predicate['type'] ?? 'folder')) {
            return null;
        }
        $field = $predicate['field'] ?? 'name';
        if (!in_array($field, ['name', 'idnumber'], true)) {
            throw new \moodle_exception('invalidprofile', 'local_filebank');
        }
        $value = (string)$cm->{$field};
        if (isset($predicate['equals'])) {
            return $value === $predicate['equals'] ? [] : null;
        }
        if (isset($predicate['template'])) {
            return $value === profile_config::template($predicate['template'], $captures) ? [] : null;
        }
        return self::pattern($predicate, $value);
    }

    /**
     * Find a unique section in the destination course.
     *
     * @param \cm_info $source Source module.
     * @param int $targetcourse Destination course.
     * @param array $policy Section policy.
     * @return int Native destination section ID.
     */
    public static function section(\cm_info $source, int $targetcourse, array $policy): int {
        global $DB;
        $section = $DB->get_record(
            'course_sections',
            ['id' => $source->section, 'course' => $source->course],
            '*',
            MUST_EXIST
        );
        $strategy = $policy['strategy'] ?? 'ordinal';
        if ($strategy === 'mapping') {
            $id = (int)($policy['map'][(string)$section->id] ?? 0);
            $matches = $DB->get_records('course_sections', ['id' => $id, 'course' => $targetcourse], 'id', 'id', 0, 2);
        } else if ($strategy === 'name' && $section->name !== null && $section->name !== '') {
            $matches = $DB->get_records('course_sections', ['course' => $targetcourse, 'name' => $section->name], 'id', 'id', 0, 2);
        } else if ($strategy === 'ordinal') {
            $matches = $DB->get_records(
                'course_sections',
                ['course' => $targetcourse, 'section' => $section->section],
                'id',
                'id',
                0,
                2
            );
        } else {
            throw new \moodle_exception('placementambiguous', 'local_filebank');
        }
        if (count($matches) !== 1) {
            throw new \moodle_exception('placementambiguous', 'local_filebank');
        }
        return (int)reset($matches)->id;
    }

    /**
     * Capture relevant native placement metadata.
     *
     * @param int $cmid Module ID.
     * @return array Fingerprint input.
     */
    public static function snapshot(int $cmid): array {
        global $DB;
        $cm = get_coursemodule_from_id('folder', $cmid, 0, false, MUST_EXIST);
        $folder = $DB->get_record('folder', ['id' => $cm->instance], '*', MUST_EXIST);
        $section = $DB->get_record('course_sections', ['id' => $cm->section], '*', MUST_EXIST);
        return ['cmid' => $cmid, 'courseid' => (int)$cm->course, 'sectionid' => (int)$cm->section,
            'sectionname' => $section->name, 'sectionnum' => (int)$section->section,
            'name' => $folder->name, 'idnumber' => $cm->idnumber, 'visible' => (int)$cm->visible,
            'availability' => $cm->availability, 'sectionvisible' => (int)$section->visible,
            'sectionavailability' => $section->availability,
            'authorlocked' => author_policy::locked($cm->course)];
    }

    /**
     * Pattern.
     *
     * @param array $predicate Predicate.
     * @param string $value Value.
     * @return ?array Result.
     */
    private static function pattern(array $predicate, string $value): ?array {
        if (
            isset($predicate['pattern']) && strlen($predicate['pattern']) <= 2048
                && in_array($predicate['pattern'][0], ['~', '#', '/'], true)
        ) {
            $pattern = $predicate['pattern'][0] . '(*LIMIT_MATCH=100000)(*LIMIT_DEPTH=1000)'
                . substr($predicate['pattern'], 1);
            $result = @preg_match($pattern, $value, $matches, PREG_UNMATCHED_AS_NULL);
            if ($result === false) {
                throw new \moodle_exception('regexfailed', 'local_filebank');
            }
            return $result ? array_filter($matches, static fn($key) => is_string($key), ARRAY_FILTER_USE_KEY) : null;
        }
        throw new \moodle_exception('invalidprofile', 'local_filebank');
    }
}
