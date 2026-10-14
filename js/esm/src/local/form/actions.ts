/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Accessible selection controls for native administration forms.
 *
 * @module local_filebank/local/form/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {RowSchema, RowValue} from '@moodle/lms/local_filebank/local/contracts';
import Selectors from '@moodle/lms/local_filebank/local/form/selectors';
import {getStrings} from '@moodle/lms/core/stringUtils';
import Templates from '@moodle/lms/local_filebank/compat/templates';
import Notification from '@moodle/lms/local_filebank/compat/notification';

/**
 * Enhance a native textarea with bounded, editable form rows.
 *
 * @param {string} id Native field ID.
 */
export const createRows = async(id: string) => {
    const field = document.getElementById(id);
    if (!(field instanceof HTMLTextAreaElement) || field.dataset.filebankRows) {
        return;
    }
    try {
        const {columns, maximum} = JSON.parse(field.dataset.filebankSchema!) as RowSchema;
        const values = JSON.parse(field.value || '[]') as RowValue[];
        if (!Array.isArray(values) || values.length > maximum) {
            return;
        }
        const [add, remove] = await getStrings([
            {key: 'addrow', component: 'local_filebank'}, {key: 'delete', component: 'core'},
        ]);
        const {html, js} = await Templates.renderForPromise('local_filebank/local/form/rows', {columns, add});
        const wrapper = document.createElement('div');
        wrapper.className = 'filebank-row-fields';
        field.after(wrapper);
        await Templates.replaceNodeContents(wrapper, html, js);
        const body = wrapper.querySelector<HTMLTableSectionElement>(Selectors.rowBody)!;
        const button = wrapper.querySelector<HTMLButtonElement>(Selectors.addRow)!;
        const synchronize = () => {
            const rows = [...body.rows].map(row => Object.fromEntries(columns.map(column => {
                const input = row.querySelector<HTMLInputElement | HTMLSelectElement>('[data-field="' + column.key + '"]')!;
                return [column.key, input instanceof HTMLInputElement && column.type === 'checkbox' ? input.checked : input.value];
            })));
            field.value = JSON.stringify(rows);
            button.disabled = rows.length >= maximum;
        };
        const append = async(value: RowValue = {}) => {
            const row = document.createElement('tr');
            for (const column of columns) {
                const cell = row.insertCell();
                const label = document.createElement('span');
                label.className = 'filebank-row-label text-muted';
                label.textContent = column.label;
                const help = document.createElement('span');
                help.innerHTML = column.help || '';
                label.append(help);
                cell.append(label);
                const input = document.createElement(column.options ? 'select' : 'input');
                input.dataset.field = column.key;
                input.setAttribute('aria-label', column.label);
                if (input instanceof HTMLSelectElement && column.options) {
                    column.options.forEach(option => input.add(new Option(option.label, option.value)));
                } else if (input instanceof HTMLInputElement) {
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
                input.className = column.type === 'checkbox' ? 'filebank-row-check'
                    : (column.options ? 'form-select form-select-sm' : 'form-control form-control-sm');
                if (column.type !== 'checkbox') {
                    input.value = String(value[column.key] || column.options?.[0]?.value || '');
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
                row.querySelector<HTMLInputElement>(Selectors.rowInputs)!.focus();
            } catch (error) {
                Notification.exception(error);
            } finally {
                synchronize();
            }
        };
        synchronize();
        const removeRow = (row: HTMLTableRowElement) => {
            row.remove();
            synchronize();
            button.focus();
        };
        return {wrapper, synchronize, addRow, removeRow};
    } catch (error) {
        Notification.exception(error);
    }
};

/**
 * Advanced rules replace the guided sections, including their native legends.
 */
export const createProfile = () => {
    const mode = document.getElementById('id_editmode');
    if (!(mode instanceof HTMLSelectElement)) {
        return;
    }
    const update = () => {
        for (const name of ['identitysettings', 'capturefilters', 'sourcesettings', 'rules']) {
            const section = document.querySelector<HTMLElement>('fieldset[id*="' + name + '"]')!;
            if (section) {
                const hidden = name === 'rules' ? mode.value !== 'advanced' : mode.value === 'advanced';
                section.hidden = hidden;
                section.querySelectorAll<HTMLInputElement>(Selectors.formControls).forEach(input => {
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
