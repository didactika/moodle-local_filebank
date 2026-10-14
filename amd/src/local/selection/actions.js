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
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/selection/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from 'local_filebank/local/selection/selectors';
import {getString} from 'local_filebank/local/strings';
import {loadFragment} from 'local_filebank/local/repository';
import Templates from 'core/templates';
import Notification from 'core/notification';


/**
 * Keep selection visible, apply filters automatically and provide functional card/list layouts.
 * @param {HTMLFormElement} form Owning native form.
 * @returns {Object} Scoped selection and navigation actions.
 */
export const createActions = (form) => {
    let timer;
    let submitting = false;
    let loading = false;
    let changes = 0;
    form.dataset.profileid = form.elements.profileid.value;
    const syncLayout = (layout = form.dataset.layout) => {
        layout = ['grid', 'list', 'tree'].includes(layout) ? layout : 'grid';
        form.dataset.layout = layout;
        form.elements.layout.value = layout;
        form.querySelectorAll(Selectors.layouts).forEach(button => {
            const active = button.dataset.filebankLayout === layout;
            button.setAttribute('aria-pressed', String(active));
            button.classList.toggle('active', active);
        });
        form.querySelectorAll(Selectors.courseToggle).forEach(heading => {
            heading.hidden = layout !== 'tree';
            heading.classList.toggle('d-none', heading.hidden);
            if (layout !== 'tree') {
                heading.setAttribute('aria-expanded', 'true');
                heading.closest(Selectors.browserTreeGroup).dataset.collapsed = 'false';
            }
        });
        form.dispatchEvent(new CustomEvent('filebank:layoutchanged', {detail: {layout}}));
    };
    const filters = form.querySelector(Selectors.filterMenu);
    const outsideClick = event => {
        if (!filters.contains(event.target)) {
            filters.open = false;
        }
    };
    const escapeFilters = event => {
        if (event.key === 'Escape' && filters.open) {
            filters.open = false;
            filters.querySelector(Selectors.summary).focus();
        }
    };
    form.querySelector(Selectors.search).hidden = true;
    const review = form.querySelector(Selectors.review);
    const update = () => {
        const selected = new Set([...form.querySelectorAll(Selectors.selectedItems)].map(input => input.value));
        const count = selected.size;
        const content = new Set(JSON.parse(form.dataset.selectedContent || '[]'));
        const folderStates = new Map(JSON.parse(form.dataset.folderstates || '[]').map(state => [state.value, state]));
        form.querySelectorAll(Selectors.choice).forEach(choice => {
            if (choice.value.startsWith('file:')) {
                choice.checked = content.has(choice.dataset.contenthash);
            } else if (folderStates.has(choice.value)) {
                const state = folderStates.get(choice.value);
                choice.checked = state.checked;
                choice.dataset.partial = state.partial ? '1' : '0';
                choice.closest(Selectors.card).querySelector(Selectors.selectionBadge)
                    .textContent = state.selectionlabel;
            }
        });
        form.querySelector(Selectors.count).textContent = count;
        review.disabled = !count || loading || count > Number(form.dataset.selectioncapacity);
        form.querySelectorAll(Selectors.choice).forEach(input => {
            input.disabled = loading || (!input.checked && input.dataset.partial !== '1'
                && count >= Number(form.dataset.selectioncapacity));
        });
        form.querySelectorAll(Selectors.choice).forEach(input => {
            input.indeterminate = input.dataset.partial === '1';
        });
        form.querySelectorAll(Selectors.card).forEach(card => {
            card.classList.toggle('filebank-selected', card.querySelector(Selectors.checkbox).checked);
        });
        form.querySelector(Selectors.clearFilters).disabled = ![...form.querySelectorAll(
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
        const raw = {items: [], captures: {}, toggleitem, refresh: !toggleitem};
        for (const [name, value] of new FormData(form)) {
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
            form.querySelector(Selectors.results).classList.add('filebank-loading');
        }
        const actions = [...form.querySelectorAll(Selectors.pendingActions)];
        actions.forEach(button => {
            button.dataset.filebankDisabled = String(button.disabled);
            button.disabled = true;
        });
        getString('filterloading', 'local_filebank').then(text => {
            form.querySelector(Selectors.loading).textContent = text;
            return text;
        }).catch(error => Notification.exception(error));
        try {
            const {html} = await loadFragment('browser', Number(form.dataset.contextid), {
                scope: raw.scope, state: JSON.stringify(raw),
            });
            if (changes !== version && !toggleitem) {
                retry = true;
                return;
            }
            const response = new DOMParser().parseFromString(html, 'text/html');
            const next = response.querySelector(Selectors.selectionForm);
            form.dataset.selectioncapacity = next.dataset.selectioncapacity;
            form.dataset.folderstates = next.dataset.folderstates;
            form.dataset.selectedContent = next.dataset.selectedContent;
            const results = form.querySelector(Selectors.results);
            const position = results.scrollTop;
            if (toggleitem) {
                const choices = new Map([...next.querySelectorAll(Selectors.choice)]
                    .map(choice => [choice.value, choice]));
                results.querySelectorAll(Selectors.choice).forEach(choice => {
                    const updated = choices.get(choice.value);
                    if (updated) {
                        choice.checked = updated.checked;
                        choice.dataset.partial = updated.dataset.partial;
                        const badge = choice.closest(Selectors.card).querySelector(Selectors.selectionBadge);
                        const nextBadge = updated.closest(Selectors.card)
                            .querySelector(Selectors.selectionBadge);
                        if (badge && nextBadge) {
                            badge.textContent = nextBadge.textContent;
                        }
                    }
                });
            } else if (changes === version) {
                await Templates.replaceNodeContents(results, next.querySelector(Selectors.results).innerHTML, '');
            }
            results.scrollTop = position;
            // Keep active inputs, caret and native select menus in their original DOM nodes.
            form.querySelectorAll(Selectors.selectedItems).forEach(input => input.remove());
            next.querySelectorAll(Selectors.selectedItems).forEach(input => form.prepend(input));
            form.querySelector(Selectors.filterCount).textContent =
                next.querySelector(Selectors.filterCount).textContent;
            form.querySelector(Selectors.count).textContent =
                next.querySelector(Selectors.count).textContent;
            if (changes !== version) {
                retry = true;
                toggleitem = '';
            }
            const profileChanged = form.dataset.profileid !== String(raw.profileid)
                && form.elements.profileid.value === String(raw.profileid);
            if (profileChanged) {
                const filterbar = form.querySelector(Selectors.filterbar);
                await Templates.replaceNodeContents(filterbar, next.querySelector(Selectors.filterbar).innerHTML, '');
                form.dataset.profileid = String(raw.profileid);
            } else {
                next.querySelectorAll(Selectors.datalist).forEach(list => {
                    const current = form.querySelector('#' + list.id);
                    if (current) {
                        current.replaceChildren(...list.children);
                    }
                });
            }
            const panel = form.closest(Selectors.panel);
            panel.querySelectorAll(Selectors.alerts).forEach(alert => alert.remove());
            response.querySelectorAll(Selectors.panelAlert).forEach(alert => panel.prepend(alert));
            results.dataset.refresh = String(Number(results.dataset.refresh || 0) + 1);
        } catch (error) {
            Notification.exception(error);
        } finally {
            loading = false;
            if (form.isConnected) {
                form.removeAttribute('aria-busy');
                form.querySelector(Selectors.results).classList.remove('filebank-loading');
                actions.forEach(button => {
                    button.disabled = button.dataset.filebankDisabled === 'true';
                });
                form.querySelector(Selectors.loading).textContent = '';
                update();
                if (retry) {
                    timer = setTimeout(() => apply(toggleitem), 250);
                }
            }
        }
    };
    const openFolder = async event => {
        const button = event.target.closest(Selectors.treeActions);
        if (!button || form.dataset.layout !== 'tree') {
            return;
        }
        event.preventDefault();
        if (loading || submitting || button.disabled) {
            return;
        }
        const folder = button.closest(Selectors.treeFolder);
        const entries = folder.querySelector(Selectors.treeEntries);
        const nextPage = button.hasAttribute('data-tree-next');
        if (!nextPage && !entries.hidden) {
            entries.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            return;
        }
        entries.hidden = false;
        folder.querySelector(Selectors.openFolder).setAttribute('aria-expanded', 'true');
        if (!nextPage && entries.dataset.loaded) {
            return;
        }
        button.disabled = true;
        entries.setAttribute('aria-busy', 'true');
        const skeleton = document.createElement('div');
        skeleton.className = 'filebank-tree-placeholder';
        skeleton.append(document.createElement('span'), document.createElement('span'));
        entries.append(skeleton);
        try {
            const {html} = await loadFragment('browser_tree', Number(form.dataset.contextid), {
                    scope: form.elements.scope.value, folder: folder.dataset.treeFolder,
                    after: nextPage ? button.dataset.treeNext : '',
                });
            const holder = document.createElement('div');
            await Templates.replaceNodeContents(holder, html, '');
            const existing = new Set([...entries.querySelectorAll(Selectors.choice)].map(choice => choice.value));
            [...holder.children].forEach(node => {
                const choice = node.querySelector(Selectors.choice);
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
    const clearFilters = event => {
        if (!event.target.closest(Selectors.clearFilters)) {
            return;
        }
        event.preventDefault();
        form.querySelectorAll(Selectors.restrictions).forEach(input => {
            input.value = '';
        });
        changes++;
        update();
        apply();
    };
    const toggleCourse = event => {
        const button = event.target.closest(Selectors.courseToggle);
        if (!button) {
            return;
        }
        const group = button.closest(Selectors.browserTreeGroup);
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(expanded));
        group.dataset.collapsed = String(!expanded);
    };
    // Remember disclosures without changing server-side authority or selection.

    const filterInput = event => {
        changes++;
        if (event.target.matches(Selectors.textFilter)) {
            update();
            clearTimeout(timer);
            timer = setTimeout(() => apply(), 500);
        }
    };
    const selectionChange = event => {
        changes++;
        if (event.target.matches(Selectors.choice)) {
            event.target.closest(Selectors.card).classList.toggle('filebank-selected', event.target.checked);
            apply(event.target.value);
            return;
        }
        update();
        if (event.target.matches(Selectors.selectFilter)) {
            clearTimeout(timer);
            apply();
        }
    };
    const selectCard = event => {
        const card = event.target.closest(Selectors.card);
        if (!card || event.target.closest(Selectors.treeInteractive)) {
            return;
        }
        const checkbox = card.querySelector(Selectors.checkbox);
        if (!checkbox.disabled && !loading) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', {bubbles: true}));
        }
    };
    const submit = event => {
        clearTimeout(timer);
        if (event.submitter?.name === 'search') {
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
            form.querySelector(Selectors.loading).textContent = text;
            return text;
        }).catch(error => Notification.exception(error));
    };
    const changeLayout = event => {
        const button = event.target.closest(Selectors.layouts);
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
