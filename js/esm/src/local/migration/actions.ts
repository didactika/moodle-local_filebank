/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Serialized automatic selections and bounded review navigation through core Fragment.
 * @module local_filebank/local/migration/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import type {MigrationState, MigrationRequest} from '@moodle/lms/local_filebank/local/contracts';
import Selectors from '@moodle/lms/local_filebank/local/migration/selectors';
import {eventElement} from '@moodle/lms/local_filebank/local/listeners';
import {loadFragment} from '@moodle/lms/local_filebank/local/repository';
import Templates from '@moodle/lms/local_filebank/compat/templates';
import Notification from '@moodle/lms/local_filebank/compat/notification';
import {getStrings} from '@moodle/lms/core/stringUtils';

/**
 * Enhance an existing review while preserving its native forms and authorization.
 * @param {HTMLElement} root Rendered feature container.
 */
export const createActions = async(root: HTMLElement) => {
    const [saving, saved] = await getStrings([
        {key: 'autosaving', component: 'local_filebank'}, {key: 'autosaved', component: 'local_filebank'},
    ]);
    let queue = Promise.resolve();
    let pending = 0;
    let failed = false;
    let canContinue = root.querySelector<HTMLElement>(Selectors.continue)!.getAttribute('aria-disabled') === 'false';
    let searchTimer: ReturnType<typeof setTimeout> | undefined;
    let viewSequence = 0;
    let resolving = false;
    const continuation = () => {
        const button = root.querySelector<HTMLElement>(Selectors.continue)!;
        const disabled = !canContinue || pending > 0 || failed;
        button.classList.toggle('disabled', disabled);
        button.setAttribute('aria-disabled', String(disabled));
        button.tabIndex = disabled ? -1 : 0;
        root.dataset.pending = String(pending);
        root.querySelectorAll<HTMLInputElement>(Selectors.resolutionControls)
            .forEach(control => {
                control.disabled = resolving;
            });
    };
    const formState = (): MigrationRequest => {
        const form = root.querySelector<HTMLFormElement>(Selectors.migrationSelection)!;
        const data = new FormData(form);
        return {
            q: String(data.get('q') || ''), page: String(data.get('page') || ''), issuepage: String(data.get('issuepage') || ''),
            decision: String(data.get('decision') || ''), perpage: String(data.get('perpage') || ''),
            visible: data.getAll('visible[]').map(String), included: data.getAll('included[]').map(String),
        };
    };
    const checks = () => [...root.querySelectorAll<HTMLInputElement>(Selectors.includedFiles)];
    const setPartial = (control: HTMLInputElement, included: number, total: number) => {
        (control as HTMLInputElement).checked = total > 0 && included === total;
        control.indeterminate = included > 0 && included < total;
    };
    const patch = (state: MigrationState) => {
        root.dataset.digest = state.digest;
        root.dataset.total = String(state.total);
        root.dataset.included = String(state.included);
        root.querySelectorAll<HTMLInputElement>(Selectors.digest).forEach(input => {
            input.value = state.digest;
        });
        root.querySelector<HTMLElement>(Selectors.planState)!.textContent = state.planstate;
        root.querySelector<HTMLElement>(Selectors.includedLabel)!.textContent = state.includedlabel;
        root.querySelector<HTMLElement>(Selectors.empty)!.hidden = !state.emptycancelled;
        canContinue = state.cancontinue;
        if (pending === 1) {
            state.checks.forEach(value => {
                const check = checks().find(input => input.value === String(value.id));
                if (check) {
                    check.checked = value.included;
                    check.closest<HTMLElement>(Selectors.operation)!.querySelector<HTMLElement>(Selectors.excluded)!.hidden
                        = value.included;
                }
            });
            state.groups.forEach(group => {
                const selector = group.cmid ? '[data-filebank-folder="' + group.cmid + '"]'
                    : '[data-filebank-course="' + group.courseid + '"]';
                root.querySelectorAll<HTMLInputElement>(selector).forEach(control => {
                    control.dataset.included = String(group.included);
                    control.dataset.total = String(group.total);
                    setPartial(control, group.included, group.total);
                });
            });
            const all = root.querySelector<HTMLInputElement>(Selectors.selectAll)!;
            if (all) {
                setPartial(all, state.included, state.total);
            }
        }
    };
    const request = (state: MigrationRequest) => {
        const sequence = state.action === 'view' ? ++viewSequence : 0;
        if (state.action === 'resolve') {
            resolving = true;
        }
        pending++;
        root.setAttribute('aria-busy', 'true');
        const status = root.querySelector<HTMLElement>(Selectors.saveStatus)!;
        if (status) {
            status.textContent = saving;
        }
        continuation();
        queue = queue.then(async() => {
            if (failed) {
                return;
            }
            const payload = {...state, planid: root.dataset.planid, digest: root.dataset.digest, sesskey: root.dataset.sesskey};
            const result = await loadFragment('migration', Number(root.dataset.contextid), {
                state: JSON.stringify(payload),
            });
            const document = new DOMParser().parseFromString(result.html, 'text/html');
            const selection = document.querySelector<HTMLElement>(Selectors.selectionState)!;
            if (selection) {
                patch(JSON.parse(selection.dataset.filebankSelectionState!));
            } else {
                if (state.action === 'view' && sequence !== viewSequence) {
                    return;
                }
                const next = document.querySelector<HTMLElement>(Selectors.migration)!;
                const open = new Map([...root.querySelectorAll<HTMLDetailsElement>('details[data-filebank-group],'
                    + 'details[data-filebank-folder-group]')].map(element => [
                    element.dataset.filebankGroup || 'folder:' + element.dataset.filebankFolderGroup, element.open,
                ]));
                const focus = root.contains(window.document.activeElement) ? window.document.activeElement?.id : '';
                const position = (window.document.activeElement as HTMLInputElement | null)?.selectionStart;
                const searchValue = root.querySelector<HTMLInputElement>(Selectors.migrationQ)!.value;
                const scroll = window.scrollY;
                await Templates.replaceNodeContents(root, next.innerHTML, result.js);
                Object.assign(root.dataset, next.dataset);
                root.dataset.ready = 'true';
                canContinue = root.querySelector<HTMLElement>(Selectors.continue)!.getAttribute('aria-disabled') === 'false';
                root.querySelectorAll<HTMLDetailsElement>(Selectors.migrationGroups)
                    .forEach(element => {
                        const key = element.dataset.filebankGroup || 'folder:' + element.dataset.filebankFolderGroup;
                        if (open.has(key)) {
                            element.open = open.get(key)!;
                        }
                    });
                root.querySelectorAll<HTMLInputElement>(Selectors.partial).forEach(control => {
                    control.indeterminate = control.dataset.partial === '1';
                });
                const field = focus && window.document.getElementById(focus);
                if (field instanceof HTMLInputElement) {
                    if (field.type === 'search') {
                        field.value = searchValue;
                    }
                    field.focus({preventScroll: true});
                    if (typeof position === 'number' && field.type === 'search') {
                        field.setSelectionRange(position, position);
                    }
                }
                window.scrollTo(0, scroll);
                const url = new URL(root.querySelector<HTMLFormElement>(Selectors.migrationSelection)!.action);
                const form = formState();
                (['q', 'page', 'decision', 'issuepage', 'perpage'] as const).forEach(key => url.searchParams.set(key, String(form[key])));
                window.history.replaceState(null, '', url);
            }
        }).catch(error => {
            failed = true;
            Notification.exception(error);
        }).finally(() => {
            if (state.action === 'resolve') {
                resolving = false;
            }
            pending--;
            continuation();
            if (!pending) {
                root.setAttribute('aria-busy', 'false');
                root.dataset.saved = String(Number(root.dataset.saved || 0) + 1);
                const status = root.querySelector<HTMLElement>(Selectors.saveStatus)!;
                if (status) {
                    status.textContent = failed ? '' : saved;
                }
            }
        });
    };
    root.querySelectorAll<HTMLInputElement>(Selectors.partial).forEach(control => {
        control.indeterminate = control.dataset.partial === '1';
    });
    const selectionChange = (event: Event) => {
        const control = eventElement(event);
        if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) {
            return;
        }
        if (control.matches(Selectors.selectAll)) {
            checks().forEach(check => {
                check.checked = (control as HTMLInputElement).checked;
            });
            root.querySelectorAll<HTMLInputElement>(Selectors.groupChecks).forEach(check => {
                check.checked = (control as HTMLInputElement).checked;
                check.indeterminate = false;
            });
            request({...formState(), action: (control as HTMLInputElement).checked ? 'all' : 'none'});
        } else if (control.matches(Selectors.groupChecks)) {
            const folder = control.hasAttribute('data-filebank-folder');
            const courseid = folder ? control.dataset.course : control.dataset.filebankCourse;
            const cmid = folder ? control.dataset.filebankFolder : '0';
            checks().filter(check => check.dataset.sourceCourse === courseid
                && (!folder || check.dataset.sourceFolder === cmid)).forEach(check => {
                check.checked = (control as HTMLInputElement).checked;
            });
            request({...formState(), action: 'group', courseid, cmid, groupincluded: (control as HTMLInputElement).checked ? 1 : 0});
        } else if (control.matches(Selectors.includedFiles)) {
            control.closest<HTMLElement>(Selectors.operation)!.querySelector<HTMLElement>(Selectors.excluded)!.hidden = (control as HTMLInputElement).checked;
            request({...formState(), action: 'page'});
        } else if (control.matches(Selectors.resolve) && control.value) {
            request({...formState(), action: 'resolve', kind: 'issue',
                id: control.closest<HTMLFormElement>(Selectors.form)!.querySelector<HTMLInputElement>(Selectors.id)!.value, choice: control.value});
        } else if (control.matches(Selectors.fileResolution) && control.value) {
            request({...formState(), action: 'resolve', kind: 'file', id: control.dataset.filebankFileResolution,
                choice: control.value});
        } else if (control.matches(Selectors.pageSize)) {
            const state = formState();
            if (control.dataset.pageparameter === 'page' || control.dataset.pageparameter === 'issuepage') {
                state[control.dataset.pageparameter] = 0;
            }
            request({...state, action: 'view', perpage: control.value});
        }
    };
    const submit = (event: SubmitEvent) => {
        if (eventElement(event).matches(Selectors.reviewSearch)) {
            event.preventDefault();
            clearTimeout(searchTimer);
            request({...formState(), action: 'view', page: 0, q: String(new FormData(eventElement(event) as HTMLFormElement).get('q') || '')});
        } else if (eventElement(event).matches(Selectors.migrationSelection)) {
            event.preventDefault();
            request({...formState(), action: 'page'});
        }
    };
    const filterInput = (event: Event) => {
        if (eventElement(event).matches(Selectors.migrationQ)) {
            viewSequence++;
            clearTimeout(searchTimer);
            const q = (eventElement(event) as HTMLInputElement).value;
            searchTimer = setTimeout(() => request({...formState(), action: 'view', page: 0, q}), 350);
        }
    };
    const navigate = (event: MouseEvent) => {
        const link = eventElement(event).closest<HTMLAnchorElement>(Selectors.links)!;
        if (!link) {
            return;
        }
        if (link.hasAttribute('data-filebank-continue') && (pending || !canContinue || failed)) {
            event.preventDefault();
            return;
        }
        const url = new URL(link.href);
        if (url.pathname === window.location.pathname && url.searchParams.get('planid') === root.dataset.planid
            && url.searchParams.get('step') !== 'execute') {
            event.preventDefault();
            request({...formState(), action: 'view', page: url.searchParams.get('page') || 0,
                q: url.searchParams.get('q') || '', decision: url.searchParams.get('decision') || '',
                issuepage: url.searchParams.get('issuepage') || 0});
        }
    };
    root.dataset.ready = 'true';
    return {selectionChange, submit, filterInput, navigate};
};
