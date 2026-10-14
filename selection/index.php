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
 * FileBank native material import integration.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once($CFG->dirroot . '/repository/lib.php');

use local_filebank\local\selection\browser_controller;

$token = required_param('scope', PARAM_ALPHANUM);
require_login();
$scope = \local_filebank\local\selection\draft_scope::describe($token, sesskey());
$PAGE->set_course(get_course($scope['courseid']));
$context = context::instance_by_id($scope['contextid']);
require_capability('local/filebank:reuse', $context);
$PAGE->set_context($context);
$PAGE->set_url('/local/filebank/selection/index.php', ['scope' => $token]);
$PAGE->set_pagelayout('embedded');
$PAGE->set_title(get_string('importmaterials', 'local_filebank'));
$input = null;
if (data_submitted()) {
    require_sesskey();
    $input = browser_controller::input($_POST);
}
$result = browser_controller::data($token, $input);
if ($result['review']) {
    redirect(new moodle_url('/local/filebank/selection/review.php', ['scope' => $token]));
}
$PAGE->set_heading($PAGE->course->fullname);
$PAGE->requires->js_call_amd('local_filebank/browser', 'selection');
echo $OUTPUT->header();
echo html_writer::start_div('', ['data-filebank-panel' => '']);
echo $result['message'];
echo $OUTPUT->render_from_template('local_filebank/local/selection/browser', $result['data']);
echo html_writer::end_div();
echo $OUTPUT->footer();
