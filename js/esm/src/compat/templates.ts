/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed adapter for Moodle APIs without an equivalent native ESM module.
 *
 * @module local_filebank/compat/templates
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {loadLegacy} from './amd';

export interface RenderedTemplate {html: string; js: string;}
interface Templates {
    renderForPromise(name: string, context: object): Promise<RenderedTemplate>;
    replaceNodeContents(node: Element, html: string, js: string): Promise<void>;
}

export default await loadLegacy<Templates>('core/templates');
