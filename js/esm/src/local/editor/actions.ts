/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/editor/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Selectors from '@moodle/lms/local_filebank/local/selectors';

import type {EditorImportStatus} from '@moodle/lms/local_filebank/local/contracts';
import type {Editor} from '@moodle/lms/local_filebank/compat/editor';

/**
 * Append approved links after Moodle inserts the first one.
 *
 * @param {Object} editor Native Tiny instance.
 * @param {Object} result Approved actor-bound import receipt.
 * @returns {boolean} Whether the native callback is ready.
 */
export const appendLinks = (editor: Editor, result: EditorImportStatus) => {
    // Await the core callback, so it retains its selected text, focus and first-link behavior.
    const linked = new Set([...editor.getBody().querySelectorAll<HTMLAnchorElement>(Selectors.links)].map(link => link.href));
    if (result.files.some(file => linked.has(file.url))) {
        const list = document.createElement('ul');
        result.files.filter(file => !linked.has(file.url)).forEach(file => {
            const item = document.createElement('li');
            const anchor = document.createElement('a');
            anchor.href = file.url;
            anchor.textContent = file.name;
            item.append(anchor);
            list.append(item);
        });
        if (list.children.length) {
            editor.undoManager.transact(() => {
                editor.selection.collapse(false);
                editor.insertContent(list.outerHTML);
                editor.save();
            });
        }
        return true;
    }
    return false;
};
