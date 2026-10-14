/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Initialize the feature actions and event listeners.
 *
 * @module local_filebank/local/migration/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from '@moodle/lms/local_filebank/local/migration/selectors';
import {createActions} from '@moodle/lms/local_filebank/local/migration/actions';
import {registerListeners} from '@moodle/lms/local_filebank/local/migration/listeners';

/**
 * Enhance the native server-rendered view.
 */
export const init = async() => {
    const root = document.querySelector<HTMLElement>(Selectors.migration);
    if (!root || root.dataset.ready || !root.querySelector(Selectors.migrationSelection)) {
        return;
    }
    const actions = await createActions(root);
    registerListeners(root, actions);
};
