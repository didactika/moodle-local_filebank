/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed adapter for Moodle APIs without an equivalent native ESM module.
 *
 * @module local_filebank/compat/fragment
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {loadLegacy} from './amd';

interface Fragment {
    loadFragment(component: string, name: string, contextid: number, args: object): {
        then(resolve: (html: string, js?: string) => void, reject: (error: unknown) => void): unknown;
    };
}

export default await loadLegacy<Fragment>('core/fragment');
