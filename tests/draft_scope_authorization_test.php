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
 * Authorization regression contracts.
 * @covers \local_filebank\form\scoped_filemanager
 * @covers \local_filebank\local\catalog\material_source
 * @covers \local_filebank\local\profile\profiles
 * @covers \local_filebank\local\selection\draft_scope
 * @covers \local_filebank\local\selection\destination_content
 * @covers \local_filebank\local\selection\browser_controller
 * @covers \local_filebank\local\selection\browser_listing
 * @covers ::local_filebank_output_fragment_browser_tree
 */
final class draft_scope_authorization_test extends draft_scope_fixture {
    /**
     * Deleting an approved destination prevents copying even when leaf snapshots are unchanged.
     */
    public function test_deleted_destination_cannot_apply(): void {
        global $USER;
        [$form, $profileid, $source, , $context] = $this->fixture();
        $directory = get_file_storage()->create_directory(
            \context_user::instance($USER->id)->id,
            'user',
            'draft',
            (int)$form->control()->getValue(),
            '/chosen/'
        );
        $token = $form->control()->open_scope($context);
        draft_state::select_destination($token, '/chosen/', sesskey());
        $review = draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], sesskey());
        $directory->delete();
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('invaliddraft', 'local_filebank'));
        draft_state::apply($token, $review['digest'], sesskey());
    }

    /**
     * The registered subclass uses actual native options, including MIME normalization and upload ceilings.
     */
    public function test_control_contract_matches_core(): void {
        [$form, , , , $context] = $this->fixture();
        $control = $form->control();
        $this->assertInstanceOf(\MoodleQuickForm_filemanager::class, $control);
        $contract = $control->get_contract($context);
        $native = new \form_filemanager(
            (object)['context' => $context, 'itemid' => $contract['draftid'],
                'maxbytes' => $control->getMaxbytes(), 'maxfiles' => $control->getMaxfiles(),
                'subdirs' => $control->getSubdirs(), 'areamaxbytes' => $control->getAreamaxbytes(),
                'accepted_types' => '.TXT, .PDF']
        );
        $this->assertSame($native->options->maxbytes, $contract['limits']['maxbytes']);
        $this->assertSame(['.txt', '.pdf'], $contract['limits']['accepted_types']);
        $this->assertSame(4, $contract['limits']['maxfiles']);
        $this->assertSame(1024, $contract['limits']['maxbytes']);
        $this->assertSame(2048, $contract['limits']['areamaxbytes']);
        $this->assertTrue($contract['limits']['subdirs']);
    }

    /**
     * A mixed batch enters the owning draft, preserving the field's pending data and native output.
     */
    public function test_form_owned_round_trip_and_replay_rejection(): void {

        global $DB, $USER;
        [$form, $profileid, $source, , $context] = $this->fixture();
        $this->preventResetByRollback();
        $control = $form->control();
        $token = $control->open_scope($context);
        $items = [['cmid' => $source->cmid, 'filepath' => '/']];
        $review = draft_state::review($token, $profileid, $items, sesskey());
        $this->assertSame(3, $review['filecount']);
        $this->assertSame(0, $DB->count_records('local_filebank_author'));
        draft_state::apply($token, $review['digest'], sesskey());
        $draftid = (int)$control->getValue();
        $files = get_file_storage()->get_area_files(
            \context_user::instance($USER->id)->id,
            'user',
            'draft',
            $draftid,
            'id',
            false
        );
        $this->assertCount(3, $files);
        $submission = scoped_form::mock_ajax_submit(['title' => 'Unsaved title', 'files' => $draftid, 'refresh' => 1]);
        $refreshed = new scoped_form(
            null,
            [
                'maxfiles' => 4, 'maxbytes' => 1024, 'areamaxbytes' => 2048,
                'subdirs' => true, 'accepted_types' => '.TXT, .PDF',
            ],
            'post',
            '',
            null,
            true,
            $submission
        );
        $this->assertNull($refreshed->get_data());
        $html = $refreshed->render();
        $this->assertStringContainsString('value="Unsaved title"', $html);
        $this->assertStringContainsString('name="files"', $html);
        $this->assertStringContainsString('filemanager', $html);
        $this->assertSame($draftid, (int)$control->getValue());
        $this->assertSame($draftid, (int)$refreshed->control()->getValue());
        $this->assertSame(2, $DB->count_records('local_filebank_author'));
        $this->assertCount(1, get_file_storage()->get_area_files($context->id, 'mod_folder', 'content', 0, 'id', false));
        file_save_draft_area_files($draftid, $context->id, 'mod_folder', 'content', 0, ['subdirs' => true]);
        $this->assertCount(3, get_file_storage()->get_area_files($context->id, 'mod_folder', 'content', 0, 'id', false));
        try {
            draft_state::apply($token, $review['digest'], sesskey());
            $this->fail('An applied approval must not be reusable.');
        } catch (\moodle_exception $exception) {
            $this->assertSame('batchconflict', $exception->errorcode);
        }
        $this->assertSame(2, $DB->count_records('local_filebank_author'));
    }

    /**
     * Even a valid control token cannot replace CSRF protection.
     */
    public function test_invalid_session_key_is_rejected(): void {
        [$form, $profileid, $source, , $context] = $this->fixture();
        $token = $form->control()->open_scope($context);
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('invalidsesskey', 'error'));
        draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], 'forged');
    }

    /**
     * Scope validity does not carry over to another logged-in editor.
     */
    public function test_another_actor_cannot_use_scope(): void {
        [$form, $profileid, $source, $target, $context] = $this->fixture();
        $token = $form->control()->open_scope($context);
        $actor = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($actor->id, $target->course, 'editingteacher');
        $scopes = draft_store::all();
        $this->setUser($actor);
        draft_store::replace($scopes);
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('formscopeunavailable', 'local_filebank'));
        draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], sesskey());
    }

    /**
     * Expired bindings stop before material resolution or draft writes.
     */
    public function test_expired_scope_is_rejected(): void {
        [$form, $profileid, $source, , $context] = $this->fixture();
        $token = $form->control()->open_scope($context);
        draft_store::update($token, static function (array &$stored): void {
            $stored['expires'] = time() - 1;
        });
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('formscopeunavailable', 'local_filebank'));
        draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], sesskey());
    }

    /**
     * Reopening a control invalidates its earlier token and reads changed server-side limits.
     */
    public function test_rebinding_reads_current_control_limits(): void {
        [$form, $profileid, $source, , $context] = $this->fixture();
        $control = $form->control();
        $oldtoken = $control->open_scope($context);
        $control->setMaxfiles(1);
        $newtoken = $control->open_scope($context);
        $this->assertNotSame($oldtoken, $newtoken);
        foreach ([$oldtoken => 'formscopeunavailable', $newtoken => 'batchlimit'] as $token => $errorcode) {
            try {
                draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], sesskey());
                $this->fail('Old authority or an exceeded limit must be rejected.');
            } catch (\moodle_exception $exception) {
                $this->assertSame($errorcode, $exception->errorcode);
            }
        }
    }

    /**
     * Smaller site limits after review invalidate the approval before copying.
     */
    public function test_changed_upload_ceiling_requires_review(): void {
        global $CFG, $DB;
        [$form, $profileid, $source, , $context] = $this->fixture();
        $this->preventResetByRollback();
        $token = $form->control()->open_scope($context);
        $review = draft_state::review($token, $profileid, [['cmid' => $source->cmid, 'filepath' => '/']], sesskey());
        $CFG->maxbytes = 512;
        try {
            draft_state::apply($token, $review['digest'], sesskey());
            $this->fail('A changed upload ceiling must invalidate approval.');
        } catch (\moodle_exception $exception) {
            $this->assertSame('batchconflict', $exception->errorcode);
        }
        $this->assertSame(0, $DB->count_records('local_filebank_author'));
    }
}
