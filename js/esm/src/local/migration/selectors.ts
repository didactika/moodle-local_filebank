/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * DOM contract for this feature.
 *
 * @module local_filebank/local/migration/selectors
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Common from '@moodle/lms/local_filebank/local/selectors';

export default {
    continue: Common.continue,
    digest: Common.digest,
    empty: Common.empty,
    excluded: Common.excluded,
    fileResolution: Common.fileResolution,
    form: Common.form,
    groupChecks: Common.groupChecks,
    id: Common.id,
    includedFiles: Common.includedFiles,
    includedLabel: Common.includedLabel,
    links: Common.links,
    migration: Common.migration,
    migrationGroups: Common.migrationGroups,
    migrationQ: Common.migrationQ,
    migrationSelection: Common.migrationSelection,
    operation: Common.operation,
    pageSize: Common.pageSize,
    partial: Common.partial,
    planState: Common.planState,
    resolutionControls: Common.resolutionControls,
    resolve: Common.resolve,
    reviewSearch: Common.reviewSearch,
    saveStatus: Common.saveStatus,
    selectAll: Common.selectAll,
    selectionState: Common.selectionState,
};
