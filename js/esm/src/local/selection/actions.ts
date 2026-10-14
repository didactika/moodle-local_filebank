/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/selection/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {FolderState, BrowserRequest} from '@moodle/lms/local_filebank/local/contracts';
import Selectors from '@moodle/lms/local_filebank/local/selection/selectors';
import {formControl} from '@moodle/lms/local_filebank/local/dom';
import {eventElement} from '@moodle/lms/local_filebank/local/listeners';
import {getString} from '@moodle/lms/core/stringUtils';
import {loadFragment} from '@moodle/lms/local_filebank/local/repository';
import Templates from '@moodle/lms/local_filebank/compat/templates';
import Notification from '@moodle/lms/local_filebank/compat/notification';


/**
 * Keep selection visible, apply filters automatically and provide functional card/list layouts.
 * @param {HTMLFormElement} form Owning native form.
 */
export const createActions = (form: HTMLFormElement) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let submitting = false;
    let loading = false;
    let changes = 0;
    form.dataset.profileid = formControl(form, 'profileid').value;
    const syncLayout = (layout = form.dataset.layout || 'grid') => {
        layout = ['grid', 'list', 'tree'].includes(layout) ? layout : 'grid';
        form.dataset.layout = layout;
        formControl(form, 'layout').value = layout;
        form.querySelectorAll<HTMLButtonElement>(Selectors.layouts).forEach(button => {
            const active = button.dataset.filebankLayout === layout;
            button.setAttribute('aria-pressed', String(active));
            button.classList.toggle('active', active);
        });
        form.querySelectorAll<HTMLInputElement>(Selectors.courseToggle).forEach(heading => {
            heading.hidden = layout !== 'tree';
            heading.classList.toggle('d-none', heading.hidden);
            if (layout !== 'tree') {
                heading.setAttribute('aria-expanded', 'true');
                heading.closest<HTMLElement>(Selectors.browserTreeGroup)!.dataset.collapsed = 'false';
            }
        });
        form.dispatchEvent(new CustomEvent('filebank:layoutchanged', {detail: {layout}}));
    };
    const filters = form.querySelector<HTMLDetailsElement>(Selectors.filterMenu)!;
    const outsideClick = (event: MouseEvent) => {
        if (!filters.contains(eventElement(event))) {
            filters.open = false;
        }
    };
    const escapeFilters = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && filters.open) {
            filters.open = false;
            filters.querySelector<HTMLElement>(Selectors.summary)!.focus();
        }
    };
    form.querySelector<HTMLElement>(Selectors.search)!.hidden = true;
    const review = form.querySelector<HTMLButtonElement>(Selectors.review)!;
    const update = () => {
        const selected = new Set([...form.querySelectorAll<HTMLInputElement>(Selectors.selectedItems)].map(input => input.value));
        const count = selected.size;
        const content = new Set<string>(JSON.parse(form.dataset.selectedContent || '[]'));
        const folderStates = new Map<string, FolderState>((JSON.parse(form.dataset.folderstates || '[]') as FolderState[]).map(state => [state.value, state]));
        form.querySelectorAll<HTMLInputElement>(Selectors.choice).forEach(choice => {
            if (choice.value.startsWith('file:')) {
                choice.checked = content.has(choice.dataset.contenthash!);
            } else if (folderStates.has(choice.value)) {
                const state = folderStates.get(choice.value)!;
                choice.checked = state.checked;
                choice.dataset.partial = state.partial ? '1' : '0';
                choice.closest<HTMLElement>(Selectors.card)!.querySelector<HTMLElement>(Selectors.selectionBadge)!
                    .textContent = state.selectionlabel;
            }
        });
        form.querySelector<HTMLElement>(Selectors.count)!.textContent = String(count);
        review.disabled = !count || loading || count > Number(form.dataset.selectioncapacity);
        form.querySelectorAll<HTMLInputElement>(Selectors.choice).forEach(input => {
            input.disabled = loading || (!input.checked && input.dataset.partial !== '1'
                && count >= Number(form.dataset.selectioncapacity));
        });
        form.querySelectorAll<HTMLInputElement>(Selectors.choice).forEach(input => {
            input.indeterminate = input.dataset.partial === '1';
        });
        form.querySelectorAll<HTMLElement>(Selectors.card).forEach(card => {
            card.classList.toggle('filebank-selected', card.querySelector<HTMLInputElement>(Selectors.checkbox)!.checked);
        });
        form.querySelector<HTMLButtonElement>(Selectors.clearFilters)!.disabled = ![...form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            Selectors.restrictions
        )].some(input => input.value.trim() !== '');
        syncLayout();
    };
    const apply = async(toggleitem = '') => {
        clearTimeout(timer);
        if (submitting || loading || !form.isConnected) {
            return;
        }
        loading = true;
        const version = changes;
        let retry = false;
        const raw: BrowserRequest = {items: [], captures: {}, toggleitem, refresh: !toggleitem};
        for (const [name, value] of new FormData(form)) {
            if (typeof value !== 'string') {
                continue;
            }
            if (name === 'items[]') {
                raw.items.push(value);
            } else if (name.startsWith('captures[')) {
                raw.captures[name.slice(9, -1)] = value;
            } else {
                raw[name] = value;
            }
        }
        form.setAttribute('aria-busy', 'true');
        if (!toggleitem) {
            form.querySelector<HTMLElement>(Selectors.results)!.classList.add('filebank-loading');
        }
        const actions = [...form.querySelectorAll<HTMLInputElement>(Selectors.pendingActions)];
        actions.forEach(button => {
            button.dataset.filebankDisabled = String(button.disabled);
            button.disabled = true;
        });
        getString('filterloading', 'local_filebank').then(text => {
            form.querySelector<HTMLElement>(Selectors.loading)!.textContent = text;
            return text;
        }).catch(() => {});
        try {
            const {html} = await loadFragment('browser', Number(form.dataset.contextid), {
                scope: String(raw.scope), state: JSON.stringify(raw),
            });
            if (changes !== version && !toggleitem) {
                retry = true;
                return;
            }
            const response = new DOMParser().parseFromString(html, 'text/html');
            const next = response.querySelector<HTMLFormElement>(Selectors.selectionForm)!;
            form.dataset.selectioncapacity = next.dataset.selectioncapacity;
            form.dataset.folderstates = next.dataset.folderstates;
            form.dataset.selectedContent = next.dataset.selectedContent;
            const results = form.querySelector<HTMLElement>(Selectors.results)!;
            const position = results.scrollTop;
            if (toggleitem) {
                const choices = new Map([...next.querySelectorAll<HTMLInputElement>(Selectors.choice)]
                    .map(choice => [choice.value, choice]));
                results.querySelectorAll<HTMLInputElement>(Selectors.choice).forEach(choice => {
                    const updated = choices.get(choice.value);
                    if (updated) {
                        choice.checked = updated.checked;
                        choice.dataset.partial = updated.dataset.partial;
                        const badge = choice.closest<HTMLElement>(Selectors.card)!.querySelector<HTMLElement>(Selectors.selectionBadge)!;
                        const nextBadge = updated.closest<HTMLElement>(Selectors.card)!
                            .querySelector<HTMLElement>(Selectors.selectionBadge)!;
                        if (badge && nextBadge) {
                            badge.textContent = nextBadge.textContent;
                        }
                    }
                });
            } else if (changes === version) {
                await Templates.replaceNodeContents(results, next.querySelector<HTMLElement>(Selectors.results)!.innerHTML, '');
            }
            results.scrollTop = position;
            // Keep active inputs, caret and native select menus in their original DOM nodes.
            form.querySelectorAll<HTMLInputElement>(Selectors.selectedItems).forEach(input => input.remove());
            next.querySelectorAll<HTMLInputElement>(Selectors.selectedItems).forEach(input => form.prepend(input));
            form.querySelector<HTMLElement>(Selectors.filterCount)!.textContent =
                next.querySelector<HTMLElement>(Selectors.filterCount)!.textContent;
            form.querySelector<HTMLElement>(Selectors.count)!.textContent =
                next.querySelector<HTMLElement>(Selectors.count)!.textContent;
            if (changes !== version) {
                retry = true;
                toggleitem = '';
            }
            const profileChanged = form.dataset.profileid !== String(raw.profileid)
                && formControl(form, 'profileid').value === String(raw.profileid);
            if (profileChanged) {
                const filterbar = form.querySelector<HTMLElement>(Selectors.filterbar)!;
                await Templates.replaceNodeContents(filterbar, next.querySelector<HTMLElement>(Selectors.filterbar)!.innerHTML, '');
                form.dataset.profileid = String(raw.profileid);
            } else {
                next.querySelectorAll<HTMLElement>(Selectors.datalist).forEach(list => {
                    const current = form.querySelector<HTMLElement>('#' + list.id)!;
                    if (current) {
                        current.replaceChildren(...list.children);
                    }
                });
            }
            const panel = form.closest<HTMLElement>(Selectors.panel)!;
            panel.querySelectorAll<HTMLElement>(Selectors.alerts).forEach(alert => alert.remove());
            response.querySelectorAll<HTMLElement>(Selectors.panelAlert).forEach(alert => panel.prepend(alert));
            results.dataset.refresh = String(Number(results.dataset.refresh || 0) + 1);
        } catch (error) {
            Notification.exception(error);
        } finally {
            loading = false;
            if (form.isConnected) {
                form.removeAttribute('aria-busy');
                form.querySelector<HTMLElement>(Selectors.results)!.classList.remove('filebank-loading');
                actions.forEach(button => {
                    button.disabled = button.dataset.filebankDisabled === 'true';
                });
                form.querySelector<HTMLElement>(Selectors.loading)!.textContent = '';
                update();
                if (retry) {
                    timer = setTimeout(() => apply(toggleitem), 250);
                }
            }
        }
    };
    const openFolder = async (event: MouseEvent) => {
        const button = eventElement(event).closest<HTMLButtonElement>(Selectors.treeActions)!;
        if (!button || form.dataset.layout !== 'tree') {
            return;
        }
        event.preventDefault();
        if (loading || submitting || button.disabled) {
            return;
        }
        const folder = button.closest<HTMLElement>(Selectors.treeFolder)!;
        const entries = folder.querySelector<HTMLElement>(Selectors.treeEntries)!;
        const nextPage = button.hasAttribute('data-tree-next');
        if (!nextPage && !entries.hidden) {
            entries.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            return;
        }
        entries.hidden = false;
        folder.querySelector<HTMLButtonElement>(Selectors.openFolder)!.setAttribute('aria-expanded', 'true');
        if (!nextPage && entries.dataset.loaded) {
            return;
        }
        button.disabled = true;
        entries.setAttribute('aria-busy', 'true');
        const skeleton = document.createElement('div');
        skeleton.className = 'filebank-tree-placeholder';
        skeleton.innerHTML = '<span></span><span></span>';
        entries.append(skeleton);
        try {
            const {html} = await loadFragment('browser_tree', Number(form.dataset.contextid), {
                    scope: formControl(form, 'scope').value, folder: folder.dataset.treeFolder,
                    after: nextPage ? button.dataset.treeNext : '',
                });
            const holder = document.createElement('div');
            await Templates.replaceNodeContents(holder, html, '');
            const existing = new Set([...entries.querySelectorAll<HTMLInputElement>(Selectors.choice)].map(choice => choice.value));
            [...holder.children].forEach(node => {
                const choice = node.querySelector<HTMLInputElement>(Selectors.choice)!;
                if (!choice || !existing.has(choice.value)) {
                    entries.append(node);
                }
            });
            if (nextPage) {
                button.remove();
            }
            entries.dataset.loaded = 'true';
            update();
        } catch (error) {
            if (!nextPage) {
                entries.hidden = true;
                button.setAttribute('aria-expanded', 'false');
            }
            Notification.exception(error);
        } finally {
            button.disabled = false;
            entries.removeAttribute('aria-busy');
            skeleton.remove();
        }
    };
    const clearFilters = (event: MouseEvent) => {
        if (!eventElement(event).closest<HTMLButtonElement>(Selectors.clearFilters)!) {
            return;
        }
        event.preventDefault();
        form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(Selectors.restrictions).forEach(input => {
            input.value = '';
        });
        changes++;
        update();
        apply();
    };
    const toggleCourse = (event: MouseEvent) => {
        const button = eventElement(event).closest<HTMLButtonElement>(Selectors.courseToggle)!;
        if (!button) {
            return;
        }
        const group = button.closest<HTMLElement>(Selectors.browserTreeGroup)!;
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(expanded));
        group.dataset.collapsed = String(!expanded);
    };
    // Remember disclosures without changing server-side authority or selection.

    const filterInput = (event: Event) => {
        changes++;
        if (eventElement(event).matches(Selectors.textFilter)) {
            update();
            clearTimeout(timer);
            timer = setTimeout(() => apply(), 500);
        }
    };
    const selectionChange = (event: Event) => {
        changes++;
        if (eventElement(event).matches(Selectors.choice)) {
            eventElement(event).closest<HTMLElement>(Selectors.card)!.classList.toggle('filebank-selected', (eventElement(event) as HTMLInputElement).checked);
            apply((eventElement(event) as HTMLInputElement).value);
            return;
        }
        update();
        if (eventElement(event).matches(Selectors.selectFilter)) {
            clearTimeout(timer);
            apply();
        }
    };
    const selectCard = (event: MouseEvent) => {
        const card = eventElement(event).closest<HTMLElement>(Selectors.card)!;
        if (!card || eventElement(event).closest<HTMLElement>(Selectors.treeInteractive)!) {
            return;
        }
        const checkbox = card.querySelector<HTMLInputElement>(Selectors.checkbox)!;
        if (!checkbox.disabled && !loading) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', {bubbles: true}));
        }
    };
    const submit = (event: SubmitEvent) => {
        clearTimeout(timer);
        if (event.submitter instanceof HTMLButtonElement && event.submitter.name === 'search') {
            event.preventDefault();
            apply();
            return;
        }
        if (submitting || loading) {
            event.preventDefault();
            return;
        }
        submitting = true;
        form.setAttribute('aria-busy', 'true');
        getString('filterloading', 'local_filebank').then(text => {
            form.querySelector<HTMLElement>(Selectors.loading)!.textContent = text;
            return text;
        }).catch(() => {});
    };
    const changeLayout = (event: MouseEvent) => {
        const button = eventElement(event).closest<HTMLButtonElement>(Selectors.layouts)!;
        if (button) {
            syncLayout(button.dataset.filebankLayout);
        }
    };
    update();
    return {
        outsideClick, escapeFilters, openFolder, clearFilters, toggleCourse,
        filterInput, selectionChange, selectCard, submit, changeLayout,
    };
};
