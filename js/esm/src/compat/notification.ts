/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed adapter for Moodle APIs without an equivalent native ESM module.
 *
 * @module local_filebank/compat/notification
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {loadLegacy} from './amd';

interface Notification {
    exception(error: unknown): void;
    alert(title: string, message: string): void;
    confirm(title: string, message: string, confirm: string, cancel: string, accept: () => void): void;
}

export default await loadLegacy<Notification>('core/notification');
