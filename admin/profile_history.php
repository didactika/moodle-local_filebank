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
 * Profile version history and side-by-side comparison.
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/adminlib.php');

use local_filebank\local\profile\profile_history;
use local_filebank\output\display;
use local_filebank\output\navigation;

$profileid = required_param('profileid', PARAM_INT);
$url = new moodle_url('/local/filebank/admin/profile_history.php', ['profileid' => $profileid]);
admin_externalpage_setup('local_filebank_profiles', '', ['profileid' => $profileid], $url);
$profile = $DB->get_record('local_filebank', ['id' => $profileid, 'deleted' => 0], '*', MUST_EXIST);
if (data_submitted()) {
    require_sesskey();
    profile_history::restore($profileid, required_param('restore', PARAM_INT));
    redirect($url, get_string('versionrestored', 'local_filebank'), null, \core\output\notification::NOTIFY_SUCCESS);
}
$page = max(0, optional_param('page', 0, PARAM_INT));
$perpage = \local_filebank\output\pagination::size();
$total = $DB->count_records('local_filebank_revision', ['profileid' => $profileid]);
$page = \local_filebank\output\pagination::clamp($total, $page, $perpage);
$records = $DB->get_records(
    'local_filebank_revision',
    ['profileid' => $profileid],
    'revision DESC',
    '*',
    $page * $perpage,
    $perpage
);
$left = optional_param('left', 0, PARAM_INT);
$right = optional_param('right', 0, PARAM_INT);
$data = ['name' => display::name($profile->name), 'profileid' => $profileid, 'action' => $url->out(false),
    'sesskey' => sesskey(), 'versions' => [], 'choices' => [], 'rows' => [],
    'backurl' => (new moodle_url('/local/filebank/admin/profile.php', ['profileid' => $profileid]))->out(false),
    'historyhelp' => $OUTPUT->help_icon('versionhistory', 'local_filebank'),
    'pagination' => \local_filebank\output\pagination::render(
        $total,
        $page,
        $perpage,
        new moodle_url($url, ['left' => optional_param('left', 0, PARAM_INT),
        'right' => optional_param(
            'right',
            0,
            PARAM_INT
        )])
    )];
if (optional_param('changesonly', false, PARAM_BOOL)) {
    $data['pagination'] = \local_filebank\output\pagination::render(
        $total,
        $page,
        $perpage,
        new moodle_url($url, ['left' => $left, 'right' => $right, 'changesonly' => 1])
    );
}
$PAGE->requires->js_call_amd('local_filebank/administration', 'init');
$choices = $records;
$wanted = array_values(array_filter(array_unique([$profile->activeid, $left, $right])));
$found = $wanted ? $DB->get_records_list('local_filebank_revision', 'id', $wanted) : [];
foreach ($wanted as $id) {
    if (!isset($found[$id]) || (int)$found[$id]->profileid !== (int)$profileid) {
        throw new dml_missing_record_exception('local_filebank_revision');
    }
    $choices[$id] = $found[$id];
}
foreach ($choices as $version) {
    $data['choices'][] = ['id' => $version->id, 'number' => $version->revision,
        'left' => $version->id == $left, 'right' => $version->id == $right];
}
foreach ($records as $version) {
    $data['versions'][] = ['id' => $version->id, 'number' => $version->revision, 'date' => userdate($version->timecreated),
        'active' => $version->id == $profile->activeid,
        'selected' => $version->id == $left || $version->id == $right,
        'compareurl' => (new moodle_url($url, ['left' => $version->id, 'right' => $profile->activeid]))->out(false)];
}
$data['offpagechoices'] = [];
foreach (array_unique([$left, $right]) as $id) {
    if ($id && !isset($records[$id])) {
        $data['offpagechoices'][] = ['id' => $id, 'number' => $choices[$id]->revision];
    }
}
if ($left && $right && $left !== $right) {
    $data['comparing'] = true;
    $data['leftnumber'] = $choices[$left]->revision;
    $data['rightnumber'] = $choices[$right]->revision;
    $data['rows'] = profile_history::compare(
        json_decode($choices[$left]->configjson, true),
        json_decode($choices[$right]->configjson, true)
    );
    if (optional_param('changesonly', false, PARAM_BOOL)) {
        $data['rows'] = array_values(array_filter($data['rows'], static fn($row) => $row['changed']));
        $data['changesonly'] = true;
    }
}
echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('pluginname', 'local_filebank'));
echo $PAGE->get_renderer('local_filebank')->render(navigation::site('profiles'));
echo $OUTPUT->render_from_template('local_filebank/local/profile/history', $data);
echo $OUTPUT->footer();
