/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed layout contract shared with the native browser event adapter.
 *
 * @module local_filebank/layout
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export type PickerLayout = 'grid' | 'list' | 'tree';

export interface LayoutView {
    value: PickerLayout;
    label: string;
    /**
     * Trusted icon markup produced by Moodle's output renderer.
     */
    icon: string;
}

/**
 * Normalize untrusted presentation state without affecting material authorization.
 *
 * @param {string} value Requested layout name.
 */
export const normalizeLayout = (value: string): PickerLayout =>
    value === 'list' || value === 'tree' ? value : 'grid';
