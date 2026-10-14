/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed access to named controls on native Moodle forms.
 *
 * @module local_filebank/local/dom
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Find a value-bearing native form control by name.
 *
 * @param {HTMLFormElement} form Owning native form.
 * @param {string} name Native field name.
 */
export const formControl = (form: HTMLFormElement, name: string): FormControl => {
    const control = form.elements.namedItem(name);
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) {
        throw new TypeError('Missing native form control: ' + name);
    }
    return control;
};
