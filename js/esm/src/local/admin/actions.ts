/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native list selection, confirmation and shared pagination controls.
 * @module local_filebank/local/admin/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import type {ProfileRowState} from '@moodle/lms/local_filebank/local/contracts';
import Selectors from '@moodle/lms/local_filebank/local/admin/selectors';
import {formControl} from '@moodle/lms/local_filebank/local/dom';
import {eventElement} from '@moodle/lms/local_filebank/local/listeners';
import Notification from '@moodle/lms/local_filebank/compat/notification';
import {loadFragment} from '@moodle/lms/local_filebank/local/repository';
import {addToast} from '@moodle/lms/local_filebank/compat/toast';
import {getStrings} from '@moodle/lms/core/stringUtils';

/**
 * Create state and actions for one bulk form.
 *
 * @param {HTMLFormElement} form Owning native form.
 */
export const createBulkActions = (form: HTMLFormElement) => {
    if (form.dataset.ready) {
        return;
    }
    form.dataset.ready = 'true';
    const all = form.querySelector<HTMLInputElement>(Selectors.selectAll)!;
    const checks = [...form.querySelectorAll<HTMLInputElement>(Selectors.bulkChecks)];
    let saving = false;
    const update = () => {
        const count = checks.filter(check => check.checked).length;
        if (all) {
            all.checked = checks.length > 0 && count === checks.length;
            all.indeterminate = count > 0 && count < checks.length;
        }
        const bulk = form.querySelector<HTMLElement>(Selectors.bulkActions)!;
        if (bulk) {
            bulk.hidden = count === 0;
            bulk.querySelectorAll<HTMLButtonElement>(Selectors.button).forEach(button => {
                button.disabled = count === 0 || saving;
                if (form.hasAttribute('data-filebank-profiles') && ['enable', 'disable'].includes(button.value)) {
                    button.hidden = !checks.some(check => check.checked
                        && check.closest<HTMLTableRowElement>(Selectors.tableRow)!.dataset.enabled === (button.value === 'enable' ? '0' : '1'));
                }
            });
        }
    };
    const selectAllChange = () => {
        checks.forEach(check => {
            check.checked = all.checked;
        });
        update();
    };

    const submit = async(event: SubmitEvent) => {
        const button = event.submitter instanceof HTMLButtonElement ? event.submitter : null;
        const row = button?.name === 'rowaction' ? button.value.split(':') : [];
        const action = row[0] || button?.value || '';
        if (form.hasAttribute('data-filebank-profiles') && ['enable', 'disable'].includes(action)) {
            event.preventDefault();
            if (saving) {
                return;
            }
            const ids = row.length ? [Number(row[1])] : checks.filter(check => check.checked)
                .map(check => Number(check.value));
            saving = true;
            form.setAttribute('aria-busy', 'true');
            form.querySelectorAll<HTMLButtonElement>(Selectors.rowActions).forEach(control => {
                control.disabled = true;
            });
            update();
            try {
                const {html} = await loadFragment('profiles', Number(form.dataset.contextid), {
                    state: JSON.stringify({ids, action, sesskey: formControl(form, 'sesskey').value}),
                });
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const states = JSON.parse(doc.querySelector<HTMLElement>(Selectors.profileState)!
                    .dataset.filebankProfileState!) as ProfileRowState[];
                states.forEach(state => {
                    const item = form.querySelector<HTMLElement>('[data-profile-id="' + state.id + '"]')!;
                    item.dataset.enabled = String(state.enabled);
                    item.querySelector<HTMLElement>(Selectors.profileStatus)!.textContent = state.status;
                    const toggle = item.querySelector<HTMLButtonElement>(Selectors.rowToggle)!;
                    toggle.value = state.action + ':' + state.id;
                    toggle.setAttribute('aria-label', state.label);
                    toggle.title = state.label;
                    toggle.innerHTML = state.icon;
                });
                const [message] = await getStrings([{key: 'changessaved', component: 'core'}]);
                await addToast(message, {type: 'success'});
            } catch (error) {
                Notification.exception(error);
            } finally {
                saving = false;
                form.removeAttribute('aria-busy');
                form.querySelectorAll<HTMLButtonElement>(Selectors.rowActions).forEach(control => {
                    control.disabled = false;
                });
                update();
            }
            return;
        }
        const destructive = button && (button.value === 'delete' || button.name === 'deleteplan'
            || button.value.startsWith('delete:'));
        if (!destructive || form.dataset.confirmed) {
            delete form.dataset.confirmed;
            return;
        }
        event.preventDefault();
        try {
            const keys = ['confirm', form.hasAttribute('data-filebank-migrations')
                ? 'migrationdeleteconfirm' : 'profilestateconfirm', 'delete', 'cancel'];
            const [title, message, yes, no] = await getStrings(keys.map(key => ({
                key, component: key.endsWith('confirm') && key !== 'confirm' ? 'local_filebank' : 'core',
            })));
            Notification.confirm(title, message, yes, no, () => {
                form.dataset.confirmed = 'true';
                form.requestSubmit(button);
            });
        } catch (error) {
            Notification.exception(error);
        }
    };
    update();

    return {update, selectAllChange, submit};
};

/**
 * Create state and actions for one version history.
 *
 * @param {HTMLElement} history Version history container.
 */
export const createHistoryActions = (history: HTMLElement) => {
    const comparison = document.getElementById('filebank-compare');
    if (!(comparison instanceof HTMLFormElement)) {
        return;
    }
    const checks = [...history.querySelectorAll<HTMLInputElement>(Selectors.versions)];
    const update = () => {
        const selected = checks.filter(check => check.checked);
        checks.forEach(check => {
            check.disabled = !check.checked && selected.length >= 2;
        });
        comparison.querySelector<HTMLButtonElement>(Selectors.button)!.disabled = selected.length !== 2;
        const ids = selected.map(check => check.value);
        formControl(comparison, 'left').value = ids[0] || '0';
        formControl(comparison, 'right').value = ids[1] || '0';
        history.querySelectorAll<HTMLElement>(Selectors.paginationControls).forEach(control => {
            const url = new URL(control instanceof HTMLAnchorElement ? control.href : control.dataset.url!, document.baseURI);
            url.searchParams.set('left', ids[0] || '0');
            url.searchParams.set('right', ids[1] || '0');
            if (control instanceof HTMLAnchorElement) {
                control.href = url.toString();
            } else {
                control.dataset.url = url.toString();
            }
        });
    };

    update();

    return {update};
};

/**
 * Navigate with the selected native page size.
 *
 * @param {Event} event Native control event.
 */
export const changePage = (event: Event) => {
            const select = eventElement(event).closest<HTMLSelectElement>(Selectors.pageSize)!;
            if (!select || select.closest<HTMLElement>(Selectors.migration)!) {
                return;
            }
            const url = new URL(select.dataset.url!, document.baseURI);
            url.searchParams.set('perpage', select.value);
            url.searchParams.set(select.dataset.pageparameter!, '0');
            window.location.assign(url);
        };
