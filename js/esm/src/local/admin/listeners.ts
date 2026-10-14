/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * admin listeners.
 * @module local_filebank/local/admin/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from '@moodle/lms/local_filebank/local/admin/selectors';
import {listen} from '@moodle/lms/local_filebank/local/listeners';
import {changePage} from '@moodle/lms/local_filebank/local/admin/actions';
import type {createBulkActions, createHistoryActions} from '@moodle/lms/local_filebank/local/admin/actions';

/**
 * Bind a bulk form while preserving selection after saves.
 *
 * @param {HTMLFormElement} form Owning native form.
 * @param {Object} actions Scoped actions created for this rendered feature.
 */
export const registerBulk = (form: HTMLFormElement, actions: NonNullable<ReturnType<typeof createBulkActions>>) => {
    const all = form.querySelector<HTMLInputElement>(Selectors.selectAll);
    if (all) {
        listen(all, 'change', actions.selectAllChange);
    }
    form.querySelectorAll(Selectors.bulkChecks).forEach(check => listen(check, 'change', actions.update));
    listen(form, 'submit', actions.submit);
};

/**
 * Bind version comparison controls.
 *
 * @param {HTMLElement} history Version history container.
 * @param {Object} actions Scoped actions created for this rendered feature.
 */
export const registerHistory = (history: HTMLElement, actions: NonNullable<ReturnType<typeof createHistoryActions>>) => {
    history.querySelectorAll(Selectors.versions).forEach(check => listen(check, 'change', actions.update));
};

/**
 * Register the delegated pagination listener once.
 */
export const registerPagination = () => {
    if (!document.body.dataset.filebankPagination) {
        document.body.dataset.filebankPagination = 'true';
        listen(document, 'change', changePage);
    }
};
