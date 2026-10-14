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
 * Course-scoped material catalog and publication controls.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');

use local_filebank\output\display;
use local_filebank\output\view;

$courseid = required_param('courseid', PARAM_INT);
$profileid = optional_param('profileid', 0, PARAM_INT);
$course = get_course($courseid);
require_login($course);
$context = context_course::instance($courseid);
require_capability('local/filebank:browse', $context);
$PAGE->set_context($context);
$PAGE->set_pagelayout('incourse');
$PAGE->set_url('/local/filebank/course/index.php', ['courseid' => $courseid, 'profileid' => $profileid]);
$PAGE->set_title(get_string('dashboard', 'local_filebank'));
$PAGE->set_heading(format_string($course->fullname));
$profiles = $DB->get_records('local_filebank', ['enabled' => 1], 'name');
if (!$profileid && $profiles) {
    $profileid = (int)reset($profiles)->id;
}
if (data_submitted() && optional_param('action', '', PARAM_ALPHA) !== '') {
    require_sesskey();
    $action = required_param('action', PARAM_ALPHA);
    if ($action === 'refresh') {
        require_capability('moodle/course:manageactivities', $context);
        $task = new \local_filebank\task\refresh_course();
        $task->set_custom_data(['courseid' => $courseid]);
        \core\task\manager::queue_adhoc_task($task, true);
        $message = get_string('refreshqueued', 'local_filebank');
    } else if ($action === 'publish' || $action === 'revoke') {
        $cm = get_coursemodule_from_id(null, required_param('cmid', PARAM_INT), $courseid, false, MUST_EXIST);
        \local_filebank\local\catalog\material_source::publish($profileid, $cm->id, $action === 'revoke');
        $message = get_string('published', 'local_filebank');
    } else {
        throw new invalid_parameter_exception('Unknown catalog action');
    }
    redirect(new moodle_url('/local/filebank/course/index.php', [
        'courseid' => $courseid, 'profileid' => $profileid,
    ]), $message);
}
$filters = [];
foreach (['q', 'edition', 'shortname', 'module', 'mimetype'] as $name) {
    $filters[$name] = optional_param($name, '', PARAM_TEXT);
}
$reseturl = new moodle_url('/local/filebank/course/index.php', ['courseid' => $courseid, 'profileid' => $profileid]);
$options = [];
foreach ($profiles as $profile) {
    $options[$profile->id] = $profile->name;
}
$data = [
    'filterhelp' => $OUTPUT->help_icon('listfilters', 'local_filebank'),
    'publicationhelp' => $OUTPUT->help_icon('publicationmodule', 'local_filebank'),
    'actionurl' => $PAGE->url->out(false), 'courseid' => $courseid, 'profileid' => $profileid,
    'sesskey' => sesskey(), 'profiles' => display::options($options, (string)$profileid),
    'hasprofiles' => (bool)$profiles, 'filters' => $filters, 'reseturl' => $reseturl->out(false),
    'multipleprofiles' => count($profiles) > 1,
    'advancedcount' => count(array_filter([$filters['shortname'], $filters['module'], $filters['mimetype']], 'strlen')),
    'advancedfilters' => $filters['shortname'] !== '' || $filters['module'] !== '' || $filters['mimetype'] !== '',
    'modules' => display::options([
        '' => get_string('allmodules', 'local_filebank'),
    ] + \local_filebank\local\catalog\source_registry::module_names(), $filters['module']),
    'filetypes' => display::options(display::filetypes(), $filters['mimetype']),
    'canrefresh' => has_capability('moodle/course:manageactivities', $context),
    'assets' => [], 'publicationenabled' => false,
];
$sourcecourses = [];
if (has_capability('local/filebank:managecoursepolicy', $context)) {
    $data['policyurl'] = (new moodle_url('/local/filebank/course/policy.php', ['courseid' => $courseid]))->out(false);
}
if ($profileid) {
    $result = \local_filebank\local\catalog\catalog::search(
        $courseid,
        $profileid,
        $filters,
        optional_param('after', '', PARAM_ALPHANUM)
    );
    foreach ($result['assets'] as $asset) {
        $asset['filename'] = $asset['occurrences'][0]['filename'];
        $asset['size'] = display_size($asset['filesize']);
        $asset['origincount'] = count($asset['occurrences']);
        foreach ($asset['occurrences'] as &$origin) {
            $sourcecourses[$origin['courseid']] = $sourcecourses[$origin['courseid']] ?? get_course($origin['courseid']);
            if (can_access_course($sourcecourses[$origin['courseid']], null, '', true)) {
                $origin['courseurl'] = (new moodle_url('/course/view.php', ['id' => $origin['courseid']]))->out(false);
            }
            $origin['shortname'] = display::name($origin['shortname'], context_course::instance($origin['courseid']));
            $origin['modulename'] = display::name($origin['modulename'], context_module::instance($origin['cmid']));
            $origin['editionlabel'] = $origin['edition'] ?? get_string('noedition', 'local_filebank');
            $origin['authorlabel'] = $origin['author'] !== ''
                ? $origin['author'] : get_string('unknownauthor', 'local_filebank');
        }
        unset($origin);
        $data['assets'][] = $asset;
    }
    if ($result['next']) {
        $data['nexturl'] = (new moodle_url('/local/filebank/course/index.php', [
            'courseid' => $courseid, 'profileid' => $profileid, 'after' => $result['next'],
        ] + $filters))->out(false);
    }
    [$profile, $revision, $rules] = \local_filebank\local\profile\profiles::load($profileid);
    $data['publicationenabled'] = ($rules->get_config()['publication']['mode'] ?? '') === 'explicit-family-publication'
        && has_capability('local/filebank:publish', $context) && $data['canrefresh'];
    if ($data['publicationenabled']) {
        $grants = $DB->get_records('local_filebank_publish', ['profileid' => $profileid], '', 'cmid, revoked');
        $data['publicationmodules'] = [];
        foreach (get_fast_modinfo($course)->get_cms() as $cm) {
            if (!\local_filebank\local\catalog\source_registry::provider($cm->modname)) {
                continue;
            }
            $label = display::name($cm->name, $cm->context);
            if (isset($grants[$cm->id]) && !$grants[$cm->id]->revoked) {
                $label .= ' — ' . get_string('publishedlabel', 'local_filebank');
            }
            $data['publicationmodules'][] = ['value' => $cm->id, 'label' => $label];
        }
        $data['haspublicationmodules'] = (bool)$data['publicationmodules'];
    }
}
$data['hasassets'] = (bool)$data['assets'];
echo $OUTPUT->header();
echo $PAGE->get_renderer('local_filebank')->render(\local_filebank\output\navigation::course('index', $courseid));
echo $PAGE->get_renderer('local_filebank')->render(new view('catalog', $data));
echo $OUTPUT->footer();
