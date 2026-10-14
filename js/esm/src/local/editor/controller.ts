/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/editor/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {appendLinks} from '@moodle/lms/local_filebank/local/editor/actions';
import {getImportStatus} from '@moodle/lms/local_filebank/local/repository';
import {getInstanceForElementId} from '@moodle/lms/local_filebank/compat/editor';
import Notification from '@moodle/lms/local_filebank/compat/notification';
import {getString} from '@moodle/lms/core/stringUtils';

/**
 * Insert remaining approved links after Tiny's native callback inserts the first one.
 *
 * @param {string} scope Session-local owning control.
 * @param {string} editorid Real server-rendered editor field ID.
 */
export const watch = async(scope: string, editorid: string) => {
    const until = Date.now() + 20000;
    try {
        while (Date.now() < until) {
            const result = await getImportStatus(scope);
            if (!result) {
                return;
            }
            if (result.ready) {
                if (!result.links || result.files.length < 2) {
                    return;
                }
                const editor = getInstanceForElementId(editorid);
                if (!editor) {
                    Notification.alert('', await getString('editorimportfailed', 'local_filebank'));
                    return;
                }
                if (appendLinks(editor, result)) {
                    return;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    } catch (error) {
        Notification.exception(error);
    }
};
