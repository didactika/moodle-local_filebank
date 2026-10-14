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

namespace local_filebank\local\selection;

use local_filebank\output\display;

/**
 * Export the native chooser template contract using Moodle help icons, names and options.
 */
final class browser_view {
    /**
     * Data.
     *
     * @param string $token Token.
     * @param array $scope Scope.
     * @param array $state State.
     * @param array $listing Listing.
     * @param array $profiles Profiles.
     * @param array $capturecontrols Capturecontrols.
     * @param bool $catalogpending Catalogpending.
     * @return array Result.
     */
    public static function data(
        string $token,
        array $scope,
        array $state,
        array $listing,
        array $profiles,
        array $capturecontrols,
        bool $catalogpending
    ): array {
        global $OUTPUT;
        return $listing + [

        'filenamehelp' => $OUTPUT->help_icon('filenamefilter', 'local_filebank'),
        'modulehelp' => $OUTPUT->help_icon('modulefilter', 'local_filebank'),
        'filetypehelp' => $OUTPUT->help_icon('filetypefilter', 'local_filebank'),
        'capturehelp' => $OUTPUT->help_icon('capturefilter', 'local_filebank'),
        'profilehelp' => $OUTPUT->help_icon('browserprofile', 'local_filebank'),
        'coursehelp' => $OUTPUT->help_icon('shortnamefilter', 'local_filebank'),
        'destinationhelp' => $OUTPUT->help_icon('batchdestination', 'local_filebank'),
        'modehelp' => $OUTPUT->help_icon('copymode', 'local_filebank'),
        'filtercount' => count(
            array_filter(
                array_merge(
                    array_intersect_key($state['filters'], array_flip(['q', 'shortname', 'module', 'mimetype', 'edition'])),
                    $state['filters']['captures'] ?? []
                ),
                static fn($value) => trim((string)$value) !== ''
            )
        ),
        'catalogpending' => $catalogpending, 'selectioncapacity' => selection_limits::capacity($scope),
        'contextid' => $scope['contextid'],
        'repositoryname' => display::name($scope['repositoryname'] ?? get_string('pluginname', 'local_filebank')),
        'layout' => $state['layout'],
        'reactlayout' => json_encode(
            [
                'initialLayout' => $state['layout'],
                'views' => array_map(
                    static fn($layout, $icon) => [
                        'value' => $layout,
                        'label' => get_string('layout' . $layout, 'local_filebank'),
                        'icon' => $OUTPUT->pix_icon($icon, '', 'core'),
                    ],
                    ['grid', 'list', 'tree'],
                    ['a/view_icon_active', 'a/view_list_active', 'a/view_tree_active']
                ),
            ],
            JSON_THROW_ON_ERROR
        ),
        'listlayout' => $state['layout'] === 'list',
        'treelayout' => $state['layout'] === 'tree',
        'gridlayout' => $state['layout'] === 'grid',
        'gridpressed' => $state['layout'] === 'grid' ? 'true' : 'false',
        'listpressed' => $state['layout'] === 'list' ? 'true' : 'false',
        'treepressed' => $state['layout'] === 'tree' ? 'true' : 'false',
        'action' => (new \moodle_url('/local/filebank/selection/index.php', ['scope' => $token]))->out(false),
        'sesskey' => sesskey(), 'scope' => $token,
        'multipleprofiles' => count($profiles) > 1, 'profileid' => $state['profileid'],
        'profiles' => display::options($profiles, (string)$state['profileid']),
        'capturefilters' => array_slice($capturecontrols, 0, 2),
        'morecapturefilters' => array_slice($capturecontrols, 2),
        'filters' => $state['filters'], 'modules' => display::options(
            [
            '' => get_string('all'),
            ] + \local_filebank\local\catalog\source_registry::module_names(),
            $state['filters']['module']
        ),
        'types' => display::options(display::filetypes(), $state['filters']['mimetype']),
        'destinations' => display::options(draft_state::destinations($token, sesskey()), $scope['basepath']),
        'modes' => display::options(
            [
            'paths' => get_string('copypaths', 'local_filebank'), 'folder' => get_string('copyfolder', 'local_filebank'),
            'contents' => get_string('copycontents', 'local_filebank'),
            ],
            $scope['copymode'] ?? 'paths'
        ),
        'locked' => \local_filebank\local\policy\author_policy::locked($scope['courseid']),
        ];
    }

    /**
     * Prepare native card data and capture controls, remembering the issued tree selectors.
     *
     * @param string $token Token.
     * @param array $scope Scope.
     * @param array $state State.
     * @return array Result.
     */
    public static function prepare(string $token, array $scope, array &$state): array {
        $listing = browser_listing::page($scope, $state);
        $state['treeroots'] = array_column(array_filter($listing['cards'], static fn($card) => $card['isfolder']), 'value');
        $state['treefolders'] = array_slice(
            array_values(
                array_unique(
                    array_merge(
                        $state['treefolders'],
                        array_column(array_filter($listing['cards'], static fn($card) => $card['isfolder']), 'value')
                    )
                )
            ),
            -material_selection::MAX_FILES
        );
        draft_state::remember_view($token, $state, sesskey());
        $capturecontrols = \local_filebank\output\capture_filters::data(
            (int)$state['profileid'],
            $state['filters']['captures'] ?? [],
            $listing['suggestions']
        );
        $listing['previouspage'] = (bool)$state['history'];
        return [$listing, $capturecontrols];
    }
}
