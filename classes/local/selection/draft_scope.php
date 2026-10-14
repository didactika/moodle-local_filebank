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
 * Session-local authorization binding for an explicitly integrated owning form.
 */
final class draft_scope {
    /**
     * @var int Maximum scope lifetime in seconds.
     */
    public const LIFETIME = 1800;
    /**
     * @var int Maximum active controls per session.
     */
    public const MAX_SCOPES = 32;

    /**
     * Locate a binding created from an actual owning form, never from request-provided limits.
     *
     * @param \context $context Repository's current context.
     * @param int $draftid Current draft.
     * @param string $sesskey Session key.
     * @return string Matching token, or empty when no native form has registered this draft.
     */
    public static function find(\context $context, int $draftid, string $sesskey): string {
        foreach (draft_store::all() as $token => $scope) {
            if ($scope['contextid'] === $context->id && $scope['draftid'] === $draftid) {
                try {
                    self::resolve($token, $sesskey);
                    return $token;
                } catch (\moodle_exception $exception) {
                    continue;
                }
            }
        }
        return '';
    }

    /**
     * Return the actor's current validated binding to server-side consumers.
     *
     * @param string $token Form scope.
     * @param string $sesskey Session key.
     * @return array Current form authority.
     */
    public static function describe(string $token, string $sesskey): array {
        return self::resolve($token, $sesskey);
    }

    /**
     * Revalidate an approved selection before handing it to the native repository transfer.
     *
     * @param string $token Form scope.
     * @param string $digest Approval.
     * @param string $sesskey Session key.
     * @return array Scope and current review.
     */
    public static function approved(string $token, string $digest, string $sesskey): array {
        $scope = self::resolve($token, $sesskey);
        $saved = $scope['review'] ?? null;
        if (!$saved || !hash_equals($saved['digest'], $digest)) {
            throw new \moodle_exception('batchconflict', 'local_filebank');
        }
        $review = draft_import::review(
            $scope['courseid'],
            $saved['profileid'],
            $scope['draftid'],
            $saved['items'],
            $scope['limits'],
            $scope['basepath'],
            $scope['copymode'] ?? 'paths',
            ['roots' => $scope['view']['roots'] ?? [], 'renames' => $scope['view']['renames'] ?? []]
        );
        if ($review['blocked'] || !hash_equals($review['digest'], $digest)) {
            throw new \moodle_exception('batchconflict', 'local_filebank');
        }
        return [$scope, $review];
    }

    /**
     * Register a real native form element, never browser-provided options.
     *
     * @param \MoodleQuickForm_filemanager $element Actual owning control.
     * @param \context $context Actual owning form context.
     * @param string $basepath Destination directory.
     * @return string Random session-local token.
     */
    public static function open(\MoodleQuickForm_filemanager $element, \context $context, string $basepath = '/'): string {

        global $USER;
        self::require_context($context, $element->getName());
        $basepath = material_selection::path($basepath);
        $contract = scoped_filemanager::read_contract($element, $context);
        if ($contract['draftid'] <= 0) {
            $element->setValue(file_get_unused_draft_itemid());
            $contract['draftid'] = (int)$element->getValue();
            get_file_storage()->create_directory(
                \context_user::instance($USER->id)->id,
                'user',
                'draft',
                $contract['draftid'],
                '/'
            );
        }
        if (
            !get_file_storage()->get_file(
                \context_user::instance($USER->id)->id,
                'user',
                'draft',
                $contract['draftid'],
                $basepath,
                '.'
            )
        ) {
            throw new \moodle_exception('invaliddraft', 'local_filebank');
        }
        return self::open_contract($contract, $context, $basepath);
    }

    /**
     * Register limits read from a live native form element by a server-side adapter.
     *
     * @param array $contract Actual native field contract, never request parameters.
     * @param \context $context Actual owning context.
     * @param string $basepath Existing destination path.
     * @return string Random session-local binding.
     */
    public static function open_contract(array $contract, \context $context, string $basepath = '/'): string {

        global $USER;
        self::require_context($context, $contract['field']);
        $basepath = material_selection::path($basepath);
        if (
            $contract['draftid'] <= 0 || !get_file_storage()->get_file(
                \context_user::instance($USER->id)->id,
                'user',
                'draft',
                $contract['draftid'],
                $basepath,
                '.'
            )
        ) {
            throw new \moodle_exception('invaliddraft', 'local_filebank');
        }
        $scopes = self::prune($contract, $context);
        $token = bin2hex(random_bytes(32));
        $contract['module'] = $context->contextlevel === CONTEXT_MODULE
            ? get_coursemodule_from_id(null, $context->instanceid)->modname : ($contract['module'] ?? '');
        $scopes[$token] = $contract + ['userid' => (int)$USER->id, 'contextid' => $context->id,
            'courseid' => (int)$context->get_course_context()->instanceid, 'basepath' => $basepath,
            'expires' => time() + self::LIFETIME];
        draft_store::replace($scopes);
        return $token;
    }

    /**
     * Refuse a token from a different form control or a changed native contract.
     *
     * @param string $token Existing binding.
     * @param \MoodleQuickForm_filemanager $element Current live control.
     * @param \context $context Owning context.
     * @param string $sesskey Current session key.
     */
    public static function assert_control(
        string $token,
        \MoodleQuickForm_filemanager $element,
        \context $context,
        string $sesskey
    ): void {
        $scope = self::resolve($token, $sesskey);
        $contract = scoped_filemanager::read_contract($element, $context);
        if (
            $scope['contextid'] !== $context->id || $scope['field'] !== $contract['field']
                || $scope['draftid'] !== $contract['draftid'] || $scope['limits'] !== $contract['limits']
        ) {
            throw new \moodle_exception('formscopeunavailable', 'local_filebank');
        }
    }

    /**
     * Explicitly release an integrated control on owning-form cancellation or completion.
     *
     * @param string $token Form scope.
     * @param string $sesskey Current session key.
     */
    public static function close(string $token, string $sesskey): void {
        self::resolve($token, $sesskey);
        draft_store::forget($token);
    }

    /**
     * Authenticate the session binding and recheck current context and upload ceilings.
     *
     * @param string $token Form scope.
     * @param string $sesskey Session key.
     * @return array Current authority.
     */
    private static function resolve(string $token, string $sesskey): array {
        global $CFG, $USER;
        if (!confirm_sesskey($sesskey)) {
            throw new \moodle_exception('invalidsesskey');
        }
        $scope = draft_store::find($token);
        if (
            !preg_match('/^[a-f0-9]{64}$/', $token) || !$scope
                || $scope['userid'] !== (int)$USER->id || $scope['expires'] <= time()
        ) {
            throw new \moodle_exception('formscopeunavailable', 'local_filebank');
        }
        $context = \context::instance_by_id($scope['contextid'], IGNORE_MISSING);
        if (!$context) {
            throw new \moodle_exception('formscopeunavailable', 'local_filebank');
        }
        self::require_context($context, $scope['field']);
        $course = get_course($scope['courseid']);
        if ((int)$context->get_course_context()->instanceid !== $scope['courseid']) {
            throw new \moodle_exception('formscopeunavailable', 'local_filebank');
        }
        $scope['limits']['maxbytes'] = get_user_max_upload_file_size(
            $context,
            $CFG->maxbytes,
            $course->maxbytes,
            $scope['limits']['maxbytes']
        );
        return $scope;
    }

    /**
     * Restrict scope creation/use to authorized course editors in course or module contexts.
     *
     * @param \context $context Owning form context.
     * @param string $field Actual field name.
     */
    private static function require_context(\context $context, string $field = ''): void {
        if (!isloggedin() || isguestuser() || !in_array($context->contextlevel, [CONTEXT_COURSE, CONTEXT_MODULE], true)) {
            throw new \moodle_exception('formscopeunavailable', 'local_filebank');
        }
        destination_access::require((int)$context->get_course_context()->instanceid, $context, $field);
    }

    /**
     * Remove expired, replaced and excess session bindings.
     *
     * @param array $contract Live native control contract.
     * @param \context $context Owning form context.
     * @return array Result.
     */
    private static function prune(array $contract, \context $context): array {
        global $USER;
        $scopes = draft_store::all();
        foreach ($scopes as $key => $scope) {
            if (
                $scope['expires'] <= time() || $scope['userid'] !== (int)$USER->id
                    || ($scope['contextid'] === $context->id && $scope['field'] === $contract['field']
                        && $scope['draftid'] === $contract['draftid'])
            ) {
                unset($scopes[$key]);
            }
        }
        $count = count($scopes);
        while ($count >= self::MAX_SCOPES) {
            array_shift($scopes);
            $count--;
        }
        return $scopes;
    }
}
