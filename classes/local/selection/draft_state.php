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
 * Session binding for reviewed native draft batches.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_filebank\local\selection;

use local_filebank\form\scoped_filemanager;

/**
 * Browser preferences and approval state for an authenticated native form binding.
 */
final class draft_state {
    /**
     * Store bounded browser state while invalidating changed visible selections.
     *
     * @param string $token Form scope.
     * @param array $view Validated browser state.
     * @param string $sesskey Session key.
     */
    public static function remember_view(string $token, array $view, string $sesskey): void {
        $scope = draft_scope::describe($token, $sesskey);
        $discard = isset($scope['review']) && ($scope['view'] ?? []) !== $view;
        draft_store::update($token, static function (array &$stored) use ($discard, $view): void {
            if ($discard) {
                unset($stored['review']);
            }
            $stored['view'] = $view;
        });
    }

    /**
     * Use the name of the native repository instance that opened this scope.
     *
     * @param string $token Actual form scope.
     * @param string $name Server-loaded repository instance name.
     * @param string $sesskey Session key.
     */
    public static function select_repository(string $token, string $name, string $sesskey): void {
        draft_scope::describe($token, $sesskey);
        draft_store::update($token, static function (array &$stored) use ($name): void {
            $stored['repositoryname'] = $name;
        });
    }

    /**
     * Narrow an editor subpicker to its requested types while retaining the native form ceilings.
     *
     * @param string $token Actual form scope.
     * @param array $types Core subpicker extensions; these may only restrict an editor's wildcard contract.
     * @param string $environment Actual native picker environment.
     * @param string $sesskey Session key.
     */
    public static function select_picker(string $token, array $types, string $environment, string $sesskey): void {
        $scope = draft_scope::describe($token, $sesskey);
        if (($scope['environment'] ?? '') !== 'editor') {
            return;
        }
        $types = (new \core_form\filetypes_util())->normalize_file_types($types) ?: ['*'];
        $links = $environment === 'editor' && in_array('*', $types, true);
        $limit = $environment === 'editor' && !$links ? 1 : material_selection::MAX_FILES;
        $changed = $scope['limits']['accepted_types'] !== $types || ($scope['limits']['selectionlimit'] ?? 0) !== $limit
            || ($scope['editorlinks'] ?? false) !== $links;
        draft_store::update($token, static function (array &$stored) use ($changed, $types, $limit, $links): void {
            if ($changed) {
                unset($stored['review'], $stored['view'], $stored['imported']);
            }
            $stored['limits']['accepted_types'] = $types;
            $stored['limits']['selectionlimit'] = $limit;
            $stored['editorlinks'] = $links;
        });
    }

    /**
     * Change folder placement only after invalidating any old approval.
     *
     * @param string $token Form scope.
     * @param string $mode Folder mapping mode.
     * @param string $sesskey Session key.
     */
    public static function select_mode(string $token, string $mode, string $sesskey): void {
        $scope = draft_scope::describe($token, $sesskey);
        if (!in_array($mode, ['paths', 'folder', 'contents'], true)) {
            throw new \moodle_exception('invalidselection', 'local_filebank');
        }
        if (($scope['copymode'] ?? 'paths') !== $mode) {
            draft_store::update($token, static function (array &$stored) use ($mode): void {
                unset($stored['review']);
                $stored['copymode'] = $mode;
            });
        }
    }

    /**
     * List existing directories in this actor's bound draft, respecting the native subdirectory option.
     *
     * @param string $token Form scope.
     * @param string $sesskey Current session key.
     * @return array Directory paths indexed by path.
     */
    public static function destinations(string $token, string $sesskey): array {
        global $DB, $USER;
        $scope = draft_scope::describe($token, $sesskey);
        $conditions = ['contextid' => \context_user::instance($USER->id)->id, 'component' => 'user',
            'filearea' => 'draft', 'itemid' => $scope['draftid'], 'filename' => '.'];
        if (!$scope['limits']['subdirs']) {
            $conditions['filepath'] = '/';
        }
        $directories = $DB->get_records('files', $conditions, 'filepath', 'id, filepath');
        $paths = array_column($directories, 'filepath');
        return array_combine($paths, $paths);
    }

    /**
     * Bind an existing destination and discard approval whenever that destination changes.
     *
     * @param string $token Form scope.
     * @param string $basepath Submitted destination directory.
     * @param string $sesskey Current session key.
     */
    public static function select_destination(string $token, string $basepath, string $sesskey): void {
        global $USER;
        $scope = draft_scope::describe($token, $sesskey);
        $basepath = material_selection::path($basepath);
        if (!$scope['limits']['subdirs'] && $basepath !== '/') {
            throw new \moodle_exception('batchlimit', 'local_filebank');
        }
        if (
            !get_file_storage()->get_file(
                \context_user::instance($USER->id)->id,
                'user',
                'draft',
                $scope['draftid'],
                $basepath,
                '.'
            )
        ) {
            throw new \moodle_exception('invaliddraft', 'local_filebank');
        }
        if ($scope['basepath'] !== $basepath) {
            draft_store::update($token, static function (array &$stored) use ($basepath): void {
                unset($stored['review']);
                $stored['basepath'] = $basepath;
            });
        }
    }

    /**
     * Require the current form fields to describe exactly the approved profile and selection.
     *
     * @param string $token Form scope.
     * @param int $profileid Current profile field.
     * @param array $items Current normalized selection.
     * @param string $digest Submitted approval.
     * @param string $sesskey Current session key.
     */
    public static function assert_review(string $token, int $profileid, array $items, string $digest, string $sesskey): void {
        $scope = draft_scope::describe($token, $sesskey);
        $review = $scope['review'] ?? null;
        if (
            !$review || $review['profileid'] !== $profileid || $review['items'] !== $items
                || !hash_equals($review['digest'], $digest)
        ) {
            self::discard_review($token);
            throw new \moodle_exception('batchconflict', 'local_filebank');
        }
    }

    /**
     * Review selectors against the stored form contract and remember only the resulting approval.
     *
     * @param string $token Form scope.
     * @param int $profileid Enabled relationship profile.
     * @param array $items Source selection.
     * @param string $sesskey Current session key.
     * @return array Batch decisions and digest.
     */
    public static function review(string $token, int $profileid, array $items, string $sesskey): array {
        $scope = draft_scope::describe($token, $sesskey);
        draft_store::update($token, static function (array &$stored): void {
            unset($stored['review'], $stored['imported']);
        });
        $review = draft_import::review(
            $scope['courseid'],
            $profileid,
            $scope['draftid'],
            $items,
            $scope['limits'],
            $scope['basepath'],
            $scope['copymode'] ?? 'paths',
            ['roots' => $scope['view']['roots'] ?? [], 'renames' => $scope['view']['renames'] ?? []]
        );
        $approval = ['profileid' => $profileid, 'items' => $items, 'digest' => $review['digest']];
        draft_store::update($token, static function (array &$stored) use ($approval): void {
            $stored['review'] = $approval;
        });
        return $review;
    }

    /**
     * Apply exactly the session's reviewed selection without accepting destination or limit overrides.
     *
     * @param string $token Form scope.
     * @param string $digest Approved review.
     * @param string $sesskey Current session key.
     * @return array Applied decisions.
     */
    public static function apply(string $token, string $digest, string $sesskey): array {
        $scope = draft_scope::describe($token, $sesskey);
        $review = $scope['review'] ?? null;
        self::discard_review($token);
        if (!$review || !hash_equals($review['digest'], $digest)) {
            throw new \moodle_exception('batchconflict', 'local_filebank');
        }
        $result = draft_import::apply(
            $scope['courseid'],
            $review['profileid'],
            $scope['draftid'],
            $review['items'],
            $scope['limits'],
            $digest,
            $scope['basepath'],
            $scope['copymode'] ?? 'paths',
            ['roots' => $scope['view']['roots'] ?? [], 'renames' => $scope['view']['renames'] ?? []]
        );
        $imported = array_map(
            static fn($operation) => [
                'filepath' => $operation['filepath'], 'filename' => $operation['filename'],
                'contenthash' => $operation['snapshot']['contenthash'],
            ],
            $result['operations']
        );
        draft_store::update($token, static function (array &$stored) use ($imported): void {
            $stored['imported'] = $imported;
        });
        return $result;
    }

    /**
     * Forget the approval of a binding, so the next import has to be reviewed again.
     *
     * @param string $token Form scope.
     */
    private static function discard_review(string $token): void {
        draft_store::update($token, static function (array &$stored): void {
            unset($stored['review']);
        });
    }
}
