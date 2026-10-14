// This file is part of Moodle - https://moodle.org/
// Moodle is free software under the GNU GPL v3 or later.

/**
 * Resolve the actual native Tiny or Atto editor without loading unavailable plugins.
 * @module local_filebank/local/editor/adapter
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Adapt the legacy editable surface and retain its original native textarea lifecycle.
 * @param {string} editorid Native field ID.
 * @returns {Promise<Object|null>} Native editor contract.
 */
export const resolve = async editorid => {
    const editable = document.getElementById(editorid + 'editable');
    const textarea = document.getElementById(editorid);
    if (editable && textarea) {
        const save = () => {
            textarea.value = editable.innerHTML;
            editable.dispatchEvent(new Event('keyup', {bubbles: true}));
            textarea.dispatchEvent(new Event('change', {bubbles: true}));
        };
        return {
            getBody: () => editable,
            selection: {collapse: () => editable.focus()},
            insertContent: html => editable.append(...new DOMParser().parseFromString(html, 'text/html').body.childNodes),
            save,
            undoManager: {transact: callback => callback()},
        };
    }
    const legacy = window.tinyMCE?.get(editorid);
    if (legacy) {
        return legacy;
    }
    return new Promise(resolve => {
        window.require(['editor_tiny/editor'], module => resolve(module.getInstanceForElementId(editorid)),
            () => resolve(null));
    });
};
