/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Bind feature events to scoped actions without owning business state.
 *
 * @module local_filebank/local/selection/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {listen} from '@moodle/lms/local_filebank/local/listeners';
import type {createActions} from '@moodle/lms/local_filebank/local/selection/actions';
import Selectors from '@moodle/lms/local_filebank/local/selection/selectors';

/**
 * Register events for this rendered feature.
 *
 * @param {HTMLFormElement} form Owning native form.
 * @param {Object} actions Scoped actions created for this rendered feature.
 */
export const registerListeners = (form: HTMLFormElement, actions: Awaited<ReturnType<typeof createActions>>) => {
    listen(document, 'click', actions.outsideClick);
    listen(form, 'keydown', actions.escapeFilters);
    listen(form, 'click', actions.openFolder);
    listen(form, 'click', actions.clearFilters);
    listen(form, 'click', actions.toggleCourse);
    listen(form, 'input', actions.filterInput);
    listen(form, 'change', actions.selectionChange);
    listen(form, 'click', actions.selectCard);
    listen(form, 'submit', actions.submit);
    listen(form, 'click', actions.changeLayout);
    form.querySelectorAll<HTMLDetailsElement>(Selectors.options).forEach(detail => {
        const key = 'filebank-options';
        try {
            detail.open = sessionStorage.getItem(key) === 'open';
        } catch (error) {
            // Native disclosures work when embedded storage is unavailable.
        }
        listen(detail, 'toggle', () => {
            try {
                sessionStorage.setItem(key, detail.open ? 'open' : 'closed');
            } catch (error) {
                // Disclosure state is optional.
            }
        });
    });
};
