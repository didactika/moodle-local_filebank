/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Server-issued frontend state and transport contracts.
 *
 * @module local_filebank/local/contracts
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Server-issued approval descriptor accepted by the native repository callback.
 */
export interface ApprovedFile {
    title: string;
    author: string;
    license: string;
    source: string;
    sourcekey: string;
    thumbnail: string;
    editorid: string;
    scope: string;
}

export interface FolderState {
    value: string;
    checked: boolean;
    partial: boolean;
    selectionlabel: string;
}

export interface EditorImportStatus {
    ready: boolean;
    links?: boolean;
    files: {url: string; name: string}[];
}

declare global {
    interface Window {
        M?: {core_filepicker?: {select_file?: (file: ApprovedFile) => void}};
        require: Require;
    }
}

export interface BrowserRequest {
    items: string[];
    captures: Record<string, string>;
    toggleitem: string;
    refresh: boolean;
    [key: string]: string | string[] | Record<string, string> | boolean;
}
export interface ProfileRowState {
    id: number; enabled: number; status: string; action: string; label: string; icon: string;
}
export interface RowSchema {
    maximum: number;
    columns: {key: string; label: string; type: string; help?: string; maxlength?: number;
        options?: {label: string; value: string}[]}[];
}
export type RowValue = Record<string, string | boolean>;
export interface MigrationState {
    digest: string; total: number; included: number; planstate: string; includedlabel: string;
    emptycancelled: boolean; cancontinue: boolean;
    checks: {id: number; included: boolean}[];
    groups: {cmid: number; courseid: number; included: number; total: number}[];
}
export interface MigrationRequest {
    q: string; page: string | number; issuepage: string | number; decision: string; perpage: string;
    visible: string[]; included: string[];
    action?: 'view' | 'all' | 'none' | 'group' | 'page' | 'resolve';
    courseid?: string; cmid?: string; groupincluded?: number; kind?: string; id?: string; choice?: string;
}
