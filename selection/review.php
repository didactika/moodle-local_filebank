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

use local_filebank\local\selection\draft_scope;
use local_filebank\local\selection\draft_state;
use local_filebank\local\selection\selection_options;
use local_filebank\output\display;
use local_filebank\output\review_tree;

$token = required_param('scope', PARAM_ALPHANUM);
require_login();
$scope = draft_scope::describe($token, sesskey());
$PAGE->set_course(get_course($scope['courseid']));
$context = context::instance_by_id($scope['contextid']);
require_capability('local/filebank:reuse', $context);
$PAGE->set_context($context);
$PAGE->set_url('/local/filebank/selection/review.php', ['scope' => $token]);
$PAGE->set_pagelayout('embedded');
$PAGE->set_title(get_string('batchreview', 'local_filebank'));
$PAGE->set_heading($PAGE->course->fullname);
$state = $scope['view'] ?? [];
$renameerror = '';
if (data_submitted()) {
    require_sesskey();
    $removed = optional_param('removeitem', '', PARAM_TEXT);
    $removeditems = optional_param('removeselected', false, PARAM_BOOL)
        ? optional_param_array('removefiles', [], PARAM_ALPHANUM) : [];
    if ($removed !== '') {
        $removeditems[] = str_starts_with($removed, 'file:') ? substr($removed, 5) : $removed;
    }
    $state['selected'] = array_values(
        array_diff(
            $state['selected'] ?? [],
            array_map(static fn($hash) => 'file:' . $hash, $removeditems)
        )
    );
    $renames = optional_param_array('renames', [], PARAM_TEXT);
    $hashes = array_map(static fn($value) => substr($value, 5), $state['selected']);
    $state['renames'] = array_intersect_key($renames, array_flip($hashes));
    try {
        foreach ($state['renames'] as $filename) {
            selection_options::filename($filename);
        }
        draft_state::remember_view($token, $state, sesskey());
        redirect($PAGE->url);
    } catch (moodle_exception $exception) {
        $renameerror = display::reason($exception->errorcode);
        $state = $scope['view'] ?? [];
    }
}
$data = ['backurl' => (new moodle_url('/local/filebank/selection/index.php', ['scope' => $token]))->out(false)];
$data += ['renameerror' => $renameerror];
$data += ['action' => $PAGE->url->out(false), 'sesskey' => sesskey(), 'scope' => $token];
try {
    $review = draft_state::review(
        $token,
        (int)($state['profileid'] ?? 0),
        selection_options::parse($state['selected'] ?? []),
        sesskey()
    );
    $data += ['count' => count($review['operations']), 'size' => display_size($review['bytes']),
        'nodes' => review_tree::data($review['operations']), 'approved' => !$review['blocked']];
    if (!$review['blocked'] && $review['operations']) {
        $source = get_file_storage()->get_file_by_hash($review['operations'][0]['pathnamehash']);
        $file = ['title' => $source->get_filename(), 'author' => $source->get_author(),
            'license' => $source->get_license(), 'thumbnail' => $OUTPUT->image_url('f/document')->out(false),
            'source' => base64_encode(json_encode(['batch' => $token, 'digest' => $review['digest']])),
            'editorid' => $scope['editorid'] ?? '', 'scope' => $token];
        $file['sourcekey'] = sha1($file['source'] . repository::get_secret_key() . sesskey());
        $PAGE->requires->js_call_amd('local_filebank/browser', 'complete', [$file]);
    }
} catch (moodle_exception $exception) {
    $data['error'] = display::reason($exception->errorcode);
}
$PAGE->requires->js_call_amd('local_filebank/browser', 'presentation');
$PAGE->requires->js_call_amd('local_filebank/review', 'init');
echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_filebank/local/selection/review', $data);
echo $OUTPUT->footer();
