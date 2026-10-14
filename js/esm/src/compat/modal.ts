/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed adapter for Moodle APIs without an equivalent native ESM module.
 *
 * @module local_filebank/compat/modal
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {loadLegacy} from './amd';

interface ModalElement {0: HTMLElement; on(name: string, handler: (event: Event) => void): void;}
interface Modal {
    setTemplateJS(js: string): void;
    getRoot(): ModalElement;
    getBody(): ModalElement;
}
interface ModalFactory {
    create(options: {title: string; body: string; show: boolean; removeOnClose: boolean}): Promise<Modal>;
}
export const ModalSaveCancel = await loadLegacy<ModalFactory>('core/modal_save_cancel');
export const ModalEvents = await loadLegacy<{save: string; hidden: string}>('core/modal_events');
