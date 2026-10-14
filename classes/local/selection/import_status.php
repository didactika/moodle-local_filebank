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
 * What an owning editor needs to know about the batch that was imported into its draft.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_filebank\local\selection;

/**
 * The files that an import left in the draft of a form, with the addresses an editor can link to.
 */
final class import_status {
    /**
     * Read the receipt of the import of one binding.
     *
     * @param array $scope The binding, as the draft scope describes it.
     * @return array Whether the import is done, whether the editor links the files, and the files with their addresses.
     */
    public static function receipt(array $scope): array {
        $files = [];
        $storage = get_file_storage();
        $context = \context_user::instance($scope['userid']);
        $existing = null;
        foreach ($scope['imported'] ?? [] as $operation) {
            $file = $storage->get_file(
                $context->id,
                'user',
                'draft',
                $scope['draftid'],
                $operation['filepath'],
                $operation['filename']
            );
            if (!$file) {
                $existing ??= $storage->get_area_files($context->id, 'user', 'draft', $scope['draftid'], 'id', false);
                $file = self::same_content($existing, $operation['contenthash']);
            }
            if ($file) {
                $files[$file->get_pathnamehash()] = [
                    'name' => $file->get_filename(),
                    'url' => \moodle_url::make_draftfile_url(
                        $scope['draftid'],
                        $file->get_filepath(),
                        $file->get_filename()
                    )->out(false),
                ];
            }
        }
        return ['ready' => isset($scope['imported']), 'links' => (bool)($scope['editorlinks'] ?? false),
            'files' => array_values($files)];
    }

    /**
     * The first file of a list that has the content that was imported.
     *
     * @param \stored_file[] $candidates Files of the draft.
     * @param string $contenthash Content that was imported.
     * @return \stored_file|null The file, or null when no file has that content.
     */
    private static function same_content(array $candidates, string $contenthash): ?\stored_file {
        foreach ($candidates as $candidate) {
            if ($candidate->get_contenthash() === $contenthash) {
                return $candidate;
            }
        }
        return null;
    }
}
