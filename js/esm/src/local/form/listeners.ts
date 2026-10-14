/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * form listeners.
 * @module local_filebank/local/form/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from '@moodle/lms/local_filebank/local/form/selectors';
import {listen, eventElement} from '@moodle/lms/local_filebank/local/listeners';
import type {createRows, createProfile} from '@moodle/lms/local_filebank/local/form/actions';

/**
 * Delegated events also cover rows appended after initialization.
 *
 * @param {Object} actions Scoped actions created for this rendered feature.
 */
export const registerRows = (actions: NonNullable<Awaited<ReturnType<typeof createRows>>>) => {
    const {wrapper} = actions;
    listen(wrapper, 'input', actions.synchronize);
    listen(wrapper, 'click', event => {
        const target = eventElement(event);
        if (target.closest(Selectors.addRow)) {
            actions.addRow();
            return;
        }
        const remove = target.closest<HTMLButtonElement>(Selectors.removeRow);
        if (remove) {
            actions.removeRow(remove.closest<HTMLTableRowElement>(Selectors.tableRow)!);
        }
    });
};

/**
 * Bind guided and advanced profile section visibility.
 *
 * @param {Object} actions Scoped actions created for this rendered feature.
 */
export const registerProfile = (actions: NonNullable<ReturnType<typeof createProfile>>) => {
    listen(actions.mode, 'change', actions.update);
};
