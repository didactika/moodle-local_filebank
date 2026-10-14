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
 * Owning native form scope integration checks.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_filebank;

use local_filebank\fixture\scoped_form;
use local_filebank\form\scoped_filemanager;
use local_filebank\local\catalog\material_source;
use local_filebank\local\profile\profiles;
use local_filebank\local\selection\draft_scope;
use local_filebank\local\selection\draft_state;
use local_filebank\local\selection\draft_store;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/fixtures/draft_scope_fixture.php');

/**
 * Limits regression contracts.
 * @covers \local_filebank\form\scoped_filemanager
 * @covers \local_filebank\local\catalog\material_source
 * @covers \local_filebank\local\profile\profiles
 * @covers \local_filebank\local\selection\draft_scope
 * @covers \local_filebank\local\selection\destination_content
 * @covers \local_filebank\local\selection\browser_controller
 * @covers \local_filebank\local\selection\browser_listing
 * @covers ::local_filebank_output_fragment_browser_tree
 */
final class draft_scope_limits_test extends draft_scope_fixture {
    /**
     * The owning form can release its binding without deleting draft files.
     */
    public function test_close_preserves_draft_and_rejects_future_use(): void {
        global $USER;
        [$form, $profileid, $source, , $context] = $this->fixture();
        $token = $form->control()->open_scope($context);
        draft_scope::close($token, sesskey());
        $this->assertCount(
            1,
            get_file_storage()->get_area_files(
                \context_user::instance($USER->id)->id,
                'user',
                'draft',
                (int)$form->control()->getValue(),
                'id',
                false
            )
        );
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('formscopeunavailable', 'local_filebank'));
        draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], sesskey());
    }

    /**
     * Frozen native fields cannot grant a writable batch scope.
     */
    public function test_frozen_control_cannot_open_scope(): void {
        [$form, , , , $context] = $this->fixture();
        $form->control()->freeze();
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('formscopeunavailable', 'local_filebank'));
        $form->control()->open_scope($context);
    }

    /**
     * New native fields can acquire an empty current-user draft before rendering.
     */
    public function test_new_field_creates_an_owned_empty_draft(): void {
        global $USER;
        [$form, , , , $context] = $this->fixture();
        $control = $form->control();
        $control->setValue(0);
        $token = $control->open_scope($context);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
        $this->assertGreaterThan(0, (int)$control->getValue());
        $this->assertNotFalse(
            get_file_storage()->get_file(
                \context_user::instance($USER->id)->id,
                'user',
                'draft',
                (int)$control->getValue(),
                '/',
                '.'
            )
        );
    }

    /**
     * Revoked activity editing authority cannot survive in a previously valid scope.
     */
    public function test_revoked_editing_authority_is_rechecked(): void {
        global $DB;
        [$form, $profileid, $source, , $context] = $this->fixture();
        $token = $form->control()->open_scope($context);
        $roleid = $DB->get_field('role', 'id', ['shortname' => 'editingteacher'], MUST_EXIST);
        assign_capability('moodle/course:manageactivities', CAP_PROHIBIT, $roleid, $context->id);
        accesslib_clear_all_caches_for_unit_testing();
        $this->expectException(\required_capability_exception::class);
        draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], sesskey());
    }

    /**
     * A positive draft belonging to a different account cannot become an owning-form binding.
     */
    public function test_foreign_draft_cannot_open_scope(): void {
        [$form, , , , $context] = $this->fixture();
        $actor = $this->getDataGenerator()->create_user();
        $draftid = file_get_unused_draft_itemid();
        get_file_storage()->create_directory(\context_user::instance($actor->id)->id, 'user', 'draft', $draftid, '/');
        $form->control()->setValue($draftid);
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('invaliddraft', 'local_filebank'));
        $form->control()->open_scope($context);
    }

    /**
     * Unclosed controls cannot grow session state without a bound.
     */
    public function test_scope_registry_is_bounded(): void {
        [$form, , , , $context] = $this->fixture();
        $control = $form->control();
        $firsttoken = '';
        for ($index = 0; $index <= draft_scope::MAX_SCOPES; $index++) {
            $control->setName('files' . $index);
            $token = $control->open_scope($context);
            $firsttoken = $firsttoken ?: $token;
        }
        $scopes = draft_store::all();
        $this->assertCount(draft_scope::MAX_SCOPES, $scopes);
        $this->assertArrayNotHasKey($firsttoken, $scopes);
        $this->assertArrayHasKey($token, $scopes);
    }
}
