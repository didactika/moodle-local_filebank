/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed adapter for Moodle APIs without an equivalent native ESM module.
 *
 * @module local_filebank/compat/amd
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {requireAsync} from '@moodle/lms/core/amd';

/**
 * Preserve both default-export and named-export AMD module contracts.
 */
export async function loadLegacy<T extends object>(name: string): Promise<T> {
    const module = await requireAsync<T | {default: T}>(name);
    return 'default' in module ? module.default : module;
}
