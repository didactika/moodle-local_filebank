/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Bind feature events to scoped actions without owning business state.
 *
 * @module local_filebank/local/migration/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {listen} from '@moodle/lms/local_filebank/local/listeners';
import type {createActions} from '@moodle/lms/local_filebank/local/migration/actions';

/**
 * Register events for this rendered feature.
 *
 * @param {HTMLElement} root Rendered feature container.
 * @param {Object} actions Scoped actions created for this rendered feature.
 */
export const registerListeners = (root: HTMLElement, actions: Awaited<ReturnType<typeof createActions>>) => {
    listen(root, 'change', actions.selectionChange);
    listen(root, 'submit', actions.submit);
    listen(root, 'input', actions.filterInput);
    listen(root, 'click', actions.navigate);
};
