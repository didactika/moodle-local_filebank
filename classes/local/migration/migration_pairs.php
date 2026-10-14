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
 * Reviewed immutable family migration planning.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_filebank\local\migration;

use local_filebank\local\catalog\material_source;
use local_filebank\local\profile\profiles;
use local_filebank\local\policy\author_policy;
use local_filebank\local\logging\log;

/**
 * Build unambiguous source and target course groups from validated capture filters.
 */
final class migration_pairs {
    /**
     * Filters.
     *
     * @param array|null $filters Requested capture filters.
     * @param array $definitions Declared capture filters.
     * @return array|null Result.
     */
    public static function filters(?array $filters, array $definitions): ?array {
        if ($filters !== null) {
            foreach (['source', 'target'] as $side) {
                if (!is_array($filters[$side] ?? null) || array_diff_key($filters[$side], $definitions)) {
                    throw new \moodle_exception('invalidprofile', 'local_filebank');
                }
                foreach ($filters[$side] as $value) {
                    if (!is_string($value) || strlen($value) > 255) {
                        throw new \moodle_exception('invalidprofile', 'local_filebank');
                    }
                }
                $filters[$side] = array_filter($filters[$side], static fn($value) => $value !== '');
            }
        }
        return $filters;
    }

    /**
     * Collect.
     *
     * @param \stdClass $revision Revision.
     * @param \local_filebank\local\profile\profile_config $rules Rules.
     * @param string $scopekey Scopekey.
     * @param string $scopecapture Scopecapture.
     * @param string $sourceedition Sourceedition.
     * @param string $targetedition Targetedition.
     * @param array|null $filters Filters.
     * @return array Result.
     */
    public static function collect(
        \stdClass $revision,
        \local_filebank\local\profile\profile_config $rules,
        string $scopekey,
        string $scopecapture,
        string $sourceedition,
        string $targetedition,
        ?array $filters
    ): array {
        global $DB;

        $pairs = [];
        $members = $DB->get_records('local_filebank_course', ['revisionid' => $revision->id], 'courseid');
        $courses = $members ? $DB->get_records_list('course', 'id', array_column($members, 'courseid')) : [];
        foreach ($members as $member) {
            self::member(
                $courses[$member->courseid] ?? null,
                $rules,
                $scopekey,
                $scopecapture,
                $sourceedition,
                $targetedition,
                $filters,
                $pairs
            );
        }
        return $pairs;
    }

    /**
     * Member.
     *
     * @param \stdClass|null $course Candidate course, or null when it no longer exists.
     * @param \local_filebank\local\profile\profile_config $rules Rules.
     * @param string $scopekey Scopekey.
     * @param string $scopecapture Scopecapture.
     * @param string $sourceedition Sourceedition.
     * @param string $targetedition Targetedition.
     * @param array|null $filters Filters.
     * @param array $pairs Pairs.
     */
    private static function member(
        ?\stdClass $course,
        \local_filebank\local\profile\profile_config $rules,
        string $scopekey,
        string $scopecapture,
        string $sourceedition,
        string $targetedition,
        ?array $filters,
        array &$pairs
    ): void {

        if (!$course || !($identity = $rules->resolve($course))) {
            return;
        }
        $dimensions = $identity['dimensions'];
        unset($dimensions[$scopecapture]);
        foreach (array_keys(($filters['source'] ?? []) + ($filters['target'] ?? [])) as $key) {
            unset($dimensions[course_scope::capture($rules, $key)]);
        }
        $key = $identity['familyhash'] . ':' . hash('sha256', json_encode($dimensions));
        if ($filters !== null && !$rules->filter_definitions()) {
            $pairs['course:' . $course->id] = ['source' => [$course->id], 'target' => [$course->id]];
            return;
        }
        [$source, $target] = self::sides($identity, $scopekey, $sourceedition, $targetedition, $filters);
        if ($source) {
            $pairs[$key]['source'][] = $course->id;
        }
        if ($target) {
            $pairs[$key]['target'][] = $course->id;
        }
    }

    /**
     * Sides.
     *
     * @param array $identity Identity.
     * @param string $scopekey Scopekey.
     * @param string $sourceedition Sourceedition.
     * @param string $targetedition Targetedition.
     * @param array|null $filters Validated side filters.
     * @return array Result.
     */
    private static function sides(
        array $identity,
        string $scopekey,
        string $sourceedition,
        string $targetedition,
        ?array $filters
    ): array {
        $value = $scopekey === 'edition' ? $identity['edition'] : ($identity['filters'][$scopekey] ?? null);
        $source = $filters === null ? $value === $sourceedition
            : !array_diff_assoc($filters['source'], $identity['filters']);
        $target = $filters === null ? $value === $targetedition
            : !array_diff_assoc($filters['target'], $identity['filters']);
        return [$source, $target];
    }
}
