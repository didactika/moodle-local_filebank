/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * DOM contract for this feature.
 *
 * @module local_filebank/local/review/selectors
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Common from '@moodle/lms/local_filebank/local/selectors';

export default {
    checkbox: Common.checkbox,
    details: Common.details,
    filename: Common.filename,
    interactive: Common.interactive,
    removeFiles: Common.removeFiles,
    removeSelected: Common.removeSelected,
    rename: Common.rename,
    renameField: Common.renameField,
    reviewFile: Common.reviewFile,
    reviewFolder: Common.reviewFolder,
    reviewForm: Common.reviewForm,
};
