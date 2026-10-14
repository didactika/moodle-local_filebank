/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * form controller.
 * @module local_filebank/local/form/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {createRows, createProfile} from '@moodle/lms/local_filebank/local/form/actions';
import {registerRows, registerProfile} from '@moodle/lms/local_filebank/local/form/listeners';

/**
 * Enhance a native textarea without changing its PHP contract.
 *
 * @param {string} id Native field ID.
 */
export const init = async(id: string) => {
    const actions = await createRows(id);
    if (actions) {
        registerRows(actions);
    }
};

/**
 * Initialize the profile editor mode.
 */
export const profile = () => {
    const actions = createProfile();
    if (actions) {
        registerProfile(actions);
    }
};
