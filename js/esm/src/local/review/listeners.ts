/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Bind feature events to scoped actions without owning business state.
 *
 * @module local_filebank/local/review/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {listen} from '@moodle/lms/local_filebank/local/listeners';
import type {createActions} from '@moodle/lms/local_filebank/local/review/actions';

/**
 * Register events for this rendered feature.
 *
 * @param {HTMLFormElement} form Owning native form.
 * @param {Object} actions Scoped actions created for this rendered feature.
 */
export const registerListeners = (form: HTMLFormElement, actions: Awaited<ReturnType<typeof createActions>>) => {
    listen(form, 'change', actions.selectionChange);
    listen(form, 'click', actions.selectFile);
    listen(form, 'click', actions.renameFile);
};
