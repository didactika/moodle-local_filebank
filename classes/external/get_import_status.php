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
 * External function: the receipt of the import that an owning editor is waiting for.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_filebank\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use local_filebank\local\selection\draft_scope;
use local_filebank\local\selection\import_status;

/**
 * The editor of the owning form asks for it until the batch has been imported, and then links the files.
 */
class get_import_status extends external_api {
    /**
     * Describe the parameters.
     *
     * @return external_function_parameters Description.
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'scope' => new external_value(PARAM_ALPHANUM, 'Binding of the native form that opened the picker'),
        ]);
    }

    /**
     * Read the receipt of the import of one binding.
     *
     * @param string $scope Binding of the native form.
     * @return array Whether the import is done, whether the editor links the files, and the files.
     */
    public static function execute(string $scope): array {
        ['scope' => $scope] = self::validate_parameters(self::execute_parameters(), ['scope' => $scope]);
        $binding = draft_scope::describe($scope, sesskey());
        $context = \context::instance_by_id($binding['contextid']);
        self::validate_context($context);
        require_capability('local/filebank:reuse', $context);
        return import_status::receipt($binding);
    }

    /**
     * Describe the returned structure.
     *
     * @return external_single_structure Description.
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'ready' => new external_value(PARAM_BOOL, 'Whether the batch has been imported into the draft'),
            'links' => new external_value(PARAM_BOOL, 'Whether the editor links the files instead of embedding them'),
            'files' => new external_multiple_structure(
                new external_single_structure([
                    'name' => new external_value(PARAM_FILE, 'Name of the file'),
                    'url' => new external_value(PARAM_URL, 'Address of the file in the draft'),
                ]),
                'The files that the import left in the draft'
            ),
        ]);
    }
}
