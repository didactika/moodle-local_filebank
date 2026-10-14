// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle. If not, see <https://www.gnu.org/licenses/>.

/**
 * Accessible selection controls for native administration forms.
 *
 * @module local_filebank/local/form/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from 'local_filebank/local/form/selectors';
import {getStrings} from 'local_filebank/local/strings';
import Templates from 'core/templates';
import Notification from 'core/notification';

/**
 * Enhance a native textarea with bounded, editable form rows.
 *
 * @param {string} id Native field ID.
 * @returns {Promise<Object|undefined>} Scoped row actions when the field is available.
 */
export const createRows = async id => {
    const field = document.getElementById(id);
    if (!field || field.dataset.filebankRows) {
        return undefined;
    }
    try {
        const {columns, maximum} = JSON.parse(field.dataset.filebankSchema);
        const values = JSON.parse(field.value || '[]');
        if (!Array.isArray(values) || values.length > maximum) {
            return undefined;
        }
        const [add, remove] = await getStrings([
            {key: 'addrow', component: 'local_filebank'}, {key: 'delete', component: 'core'},
        ]);
        const {html, js} = await Templates.renderForPromise('local_filebank/local/form/rows', {columns, add});
        const wrapper = document.createElement('div');
        wrapper.className = 'filebank-row-fields';
        field.after(wrapper);
        await Templates.replaceNodeContents(wrapper, html, js);
        const body = wrapper.querySelector(Selectors.rowBody);
        const button = wrapper.querySelector(Selectors.addRow);
        const synchronize = () => {
            const rows = [...body.rows].map(row => Object.fromEntries(columns.map(column => {
                const input = row.querySelector('[data-field="' + column.key + '"]');
                return [column.key, column.type === 'checkbox' ? input.checked : input.value];
            })));
            field.value = JSON.stringify(rows);
            button.disabled = rows.length >= maximum;
        };
        const append = async(value = {}) => {
            const row = document.createElement('tr');
            for (const column of columns) {
                const cell = row.insertCell();
                const label = document.createElement('span');
                label.className = 'filebank-row-label text-muted';
                label.textContent = column.label;
                const help = document.createElement('span');
                help.append(...new DOMParser().parseFromString(column.help || '', 'text/html').body.childNodes);
                label.append(help);
                cell.append(label);
                const input = document.createElement(column.options ? 'select' : 'input');
                input.dataset.field = column.key;
                input.setAttribute('aria-label', column.label);
                if (column.options) {
                    column.options.forEach(option => input.add(new Option(option.label, option.value)));
                } else {
                    input.type = column.type;
                    if (column.type === 'checkbox') {
                        input.checked = Boolean(value[column.key]);
                    } else {
                        input.maxLength = column.maxlength || 2048;
                        // PHP validates completed rows; new blank rows must not block native cancellation.
                        if (['key', 'capture'].includes(column.key)) {
                            input.pattern = '[A-Za-z][A-Za-z0-9_]{0,63}';
                        }
                    }
                }
                if (column.type === 'checkbox') {
                    input.className = 'filebank-row-check';
                } else {
                    input.className = column.options ? 'custom-select custom-select-sm' : 'form-control form-control-sm';
                }
                if (column.type !== 'checkbox') {
                    input.value = value[column.key] || column.options?.[0]?.value || '';
                }
                cell.append(input);
            }
            const cell = row.insertCell();
            cell.className = 'filebank-row-remove';
            const {html, js} = await Templates.renderForPromise('local_filebank/local/form/remove_row', {remove});
            await Templates.replaceNodeContents(cell, html, js);
            body.append(row);
            return row;
        };
        for (const value of values) {
            await append(value);
        }
        field.hidden = true;
        field.dataset.filebankRows = 'true';
        const addRow = async() => {
            if (body.rows.length >= maximum) {
                return;
            }
            button.disabled = true;
            try {
                const row = await append();
                row.querySelector(Selectors.rowInputs).focus();
            } catch (error) {
                Notification.exception(error);
            } finally {
                synchronize();
            }
        };
        synchronize();
        const removeRow = (row) => {
            row.remove();
            synchronize();
            button.focus();
        };
        return {wrapper, synchronize, addRow, removeRow};
    } catch (error) {
        Notification.exception(error);
        return undefined;
    }
};

/**
 * Advanced rules replace the guided sections, including their native legends.
 * @returns {Object|undefined} Scoped profile actions when the editor is present.
 */
export const createProfile = () => {
    const mode = document.getElementById('id_editmode');
    if (!mode) {
        return undefined;
    }
    const update = () => {
        for (const name of ['identitysettings', 'capturefilters', 'sourcesettings', 'rules']) {
            const section = document.querySelector('fieldset[id*="' + name + '"]');
            if (section) {
                const hidden = name === 'rules' ? mode.value !== 'advanced' : mode.value === 'advanced';
                section.hidden = hidden;
                section.querySelectorAll(Selectors.formControls).forEach(input => {
                    if (!input.name.endsWith('json')) {
                        input.disabled = hidden;
                    }
                });
            }
        }
    };
    update();
    return {mode, update};
};
