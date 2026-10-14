# Changelog

## [Unreleased]

- Show how many of the filters hidden under "More filters" are applied, as a count on the corner of the funnel icon, the same one the other plugins use.

## [1.0.0-m400] - 2026-10-11

First release of the Moodle 4.0 to 5.2 line, on `MOODLE_400_STABLE`. The Moodle 5.3 line is on `main` (1.0.0-m503).

### Added

- Profiles of related courses, defined by named regular-expression captures that can also become search filters, with guided editing, import and export, retained versions, comparison and restoration.
- A file picker with cards, list and lazy tree views, recursive multiple selection of the public material of other courses (Folder, File, Assignment handouts and other registered providers), destination limits, and material already used in the destination excluded before browsing.
- A review of the resulting file tree before copying, with removal checks and dialogs for destination names.
- Migrations between courses with source filters and activity correspondences, paginated review, conflict choices and background execution.
- Original authorship declarations preserved at copy time, with configurable protection and provenance.
- A bounded log and configurable retention of logs, migrations and inactive profile versions.
- The interface is written in AMD modules and Mustache templates, with the same features as the 5.3 line.
