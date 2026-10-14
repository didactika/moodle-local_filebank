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
 * The receipt that an owning editor reads once a batch has been imported.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_filebank;

use core_external\external_api;
use local_filebank\external\get_import_status;
use local_filebank\local\selection\draft_scope;
use local_filebank\local\selection\draft_store;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/fixtures/draft_scope_fixture.php');

/**
 * Import status regression contracts.
 * @covers \local_filebank\external\get_import_status
 * @covers \local_filebank\local\selection\import_status
 */
final class import_status_test extends draft_scope_fixture {
    /**
     * Nothing is ready before the batch has been imported.
     */
    public function test_receipt_is_not_ready_before_the_import(): void {
        [$form, , , , $context] = $this->fixture();
        $token = $form->control()->open_scope($context);
        $result = get_import_status::clean_returnvalue(get_import_status::execute_returns(), get_import_status::execute($token));
        $this->assertFalse($result['ready']);
        $this->assertSame([], $result['files']);
    }

    /**
     * The files that the import left in the draft are listed with an address that an editor can link to.
     */
    public function test_receipt_lists_the_files_that_the_import_left(): void {
        global $USER;
        [$form, , , , $context] = $this->fixture();
        $token = $form->control()->open_scope($context);
        $draftid = draft_scope::describe($token, sesskey())['draftid'];
        $file = get_file_storage()->create_file_from_string([
            'contextid' => \context_user::instance($USER->id)->id, 'component' => 'user', 'filearea' => 'draft',
            'itemid' => $draftid, 'filepath' => '/', 'filename' => 'receipt.txt',
        ], 'content');
        draft_store::update($token, static function (array &$stored) use ($file): void {
            $stored['imported'] = [['filepath' => '/', 'filename' => 'receipt.txt', 'contenthash' => $file->get_contenthash()]];
        });
        $result = get_import_status::clean_returnvalue(get_import_status::execute_returns(), get_import_status::execute($token));
        $this->assertTrue($result['ready']);
        $this->assertSame('receipt.txt', $result['files'][0]['name']);
        $this->assertStringContainsString('/draftfile.php/', $result['files'][0]['url']);
    }

    /**
     * A token that the session does not hold is refused.
     */
    public function test_receipt_of_an_unknown_scope_is_refused(): void {
        $this->fixture();
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('formscopeunavailable', 'local_filebank'));
        get_import_status::execute(str_repeat('a', 64));
    }
}
