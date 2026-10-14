/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * admin selectors.
 * @module local_filebank/local/admin/selectors
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Common from '@moodle/lms/local_filebank/local/selectors';

export default {
    bulkActions: Common.bulkActions,
    bulkChecks: Common.bulkChecks,
    bulkForms: Common.bulkForms,
    button: Common.button,
    history: Common.history,
    migration: Common.migration,
    pageSize: Common.pageSize,
    paginationControls: Common.paginationControls,
    profileState: Common.profileState,
    profileStatus: Common.profileStatus,
    rowActions: Common.rowActions,
    rowToggle: Common.rowToggle,
    selectAll: Common.selectAll,
    tableRow: Common.tableRow,
    versions: Common.versions,
};
