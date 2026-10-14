/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * form selectors.
 * @module local_filebank/local/form/selectors
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Common from '@moodle/lms/local_filebank/local/selectors';

export default {
    addRow: Common.addRow,
    formControls: Common.formControls,
    removeRow: ".filebank-row-remove button",
    rowBody: Common.rowBody,
    rowInputs: Common.rowInputs,
    tableRow: "tr",
};
