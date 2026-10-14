/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Rename reviewed files through Moodle's native save/cancel modal.
 *
 * @module local_filebank/local/review/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from '@moodle/lms/local_filebank/local/review/selectors';
import {eventElement} from '@moodle/lms/local_filebank/local/listeners';
import {ModalSaveCancel, ModalEvents} from '@moodle/lms/local_filebank/compat/modal';
import {getString} from '@moodle/lms/core/stringUtils';
import Templates from '@moodle/lms/local_filebank/compat/templates';
import Notification from '@moodle/lms/local_filebank/compat/notification';

/**
 * Bind pencil actions without making every filename an editable field.
 * @param {HTMLFormElement} form Owning native form.
 */
export const createActions = (form: HTMLFormElement) => {
    const update = () => {
        const selected = [...form.querySelectorAll<HTMLInputElement>(Selectors.removeFiles)].filter(check => check.checked);
        form.querySelectorAll<HTMLInputElement>(Selectors.reviewFolder).forEach(check => {
            const descendants = [...check.closest<HTMLDetailsElement>(Selectors.details)!.querySelectorAll<HTMLInputElement>(Selectors.removeFiles)];
            const count = descendants.filter(file => file.checked).length;
            check.checked = count > 0 && count === descendants.length;
            check.indeterminate = count > 0 && count < descendants.length;
        });
        const remove = document.querySelector<HTMLButtonElement>(Selectors.removeSelected)!;
        remove.hidden = selected.length === 0;
        remove.disabled = selected.length === 0;
    };
    const selectionChange = (event: Event) => {
        const folder = eventElement(event).closest<HTMLInputElement>(Selectors.reviewFolder)!;
        if (folder) {
            folder.closest<HTMLDetailsElement>(Selectors.details)!.querySelectorAll<HTMLInputElement>(Selectors.removeFiles).forEach(check => {
                check.checked = folder.checked;
            });
        }
        update();
    };
    const selectFile = (event: MouseEvent) => {
        const row = eventElement(event).closest<HTMLElement>(Selectors.reviewFile)!;
        if (!row || eventElement(event).closest<HTMLButtonElement>(Selectors.interactive)!) {
            return;
        }
        const check = row.querySelector<HTMLInputElement>(Selectors.checkbox)!;
        check.checked = !check.checked;
        check.dispatchEvent(new Event('change', {bubbles: true}));
    };
    const renameFile = async (event: MouseEvent) => {
        const button = eventElement(event).closest<HTMLButtonElement>(Selectors.rename)!;
        if (!button || button.disabled) {
            return;
        }
        button.disabled = true;
        try {
            const name = button.closest<HTMLElement>(Selectors.reviewFile)!.querySelector<HTMLInputElement>(Selectors.renameField)!;
            const title = await getString('renamefile', 'local_filebank');
            const {html, js} = await Templates.renderForPromise('local_filebank/local/selection/rename', {
                name: name.value, label: title,
            });
            const modal = await ModalSaveCancel.create({title, body: html, show: true, removeOnClose: true});
            modal.setTemplateJS(js);
            modal.getRoot().on(ModalEvents.save, event => {
                const input = modal.getBody()[0].querySelector<HTMLInputElement>(Selectors.filename)!;
                if (!input.reportValidity()) {
                    event.preventDefault();
                    return;
                }
                name.value = input.value;
                form.requestSubmit();
            });
            modal.getRoot().on(ModalEvents.hidden, () => {
                button.disabled = false;
                button.focus({preventScroll: true});
            });
        } catch (error) {
            button.disabled = false;
            Notification.exception(error);
        }
    };
    update();
    return {selectionChange, selectFile, renameFile};
};
