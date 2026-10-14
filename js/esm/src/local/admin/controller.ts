/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * admin controller.
 * @module local_filebank/local/admin/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from '@moodle/lms/local_filebank/local/admin/selectors';
import {createBulkActions, createHistoryActions} from '@moodle/lms/local_filebank/local/admin/actions';
import {registerBulk, registerHistory, registerPagination} from '@moodle/lms/local_filebank/local/admin/listeners';

/**
 * Initialize native administration controls.
 */
export const init = () => {
    document.querySelectorAll<HTMLFormElement>(Selectors.bulkForms).forEach(form => {
        const actions = createBulkActions(form);
        if (actions) {
            registerBulk(form, actions);
        }
    });
    document.querySelectorAll<HTMLElement>(Selectors.history).forEach(history => {
        const actions = createHistoryActions(history);
        if (actions) {
            registerHistory(history, actions);
        }
    });
    registerPagination();
};
