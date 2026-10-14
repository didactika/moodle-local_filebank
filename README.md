<div align="center">

<img src="pix/icon.svg" width="96" alt="FileBank icon">

# FileBank for Moodle

*Find and reuse public course files across related courses*

[![Release](https://img.shields.io/github/v/release/didactika/moodle-local_filebank?filter=v*-m503&style=flat-square)](https://github.com/didactika/moodle-local_filebank/releases)
[![Moodle](https://img.shields.io/badge/Moodle-5.3-f98012?style=flat-square&logo=moodle&logoColor=white)](https://moodle.org)
[![PHP](https://img.shields.io/badge/PHP-8.3+-777bb4?style=flat-square&logo=php&logoColor=white)](https://www.php.net)
[![License](https://img.shields.io/badge/License-GPL_v3-blue?style=flat-square)](LICENSE)

[Overview](#overview) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Troubleshooting](#troubleshooting)

</div>

FileBank (**local_filebank**) organizes public course files into a reusable library. Configurable profiles identify related courses, and teachers select material from those courses inside Moodle’s normal file picker. Administrators can also migrate complete sets of material between courses.

> [!IMPORTANT]
> **Install both [FileBank local](https://github.com/didactika/moodle-local_filebank) and [FileBank repository](https://github.com/didactika/moodle-repository_filebank).** Choose the same Moodle maintenance line for both plugins.

## Overview

Profiles define which courses belong together using named regular-expression captures. The same captures can become search filters, so institutions can describe their own groups without fixed year or semester rules.

| Feature | What it provides |
|---|---|
| Public files | Supported public material from Folder, File, Assignment handouts and other registered providers |
| File picker | Cards, list and lazy tree views with recursive multiple selection |
| Existing content | Material already used in the destination is excluded before browsing |
| Review | Resulting-file tree, removal checks and pencil dialogs for destination names |
| Profiles | Guided editing, import/export, retained versions, comparison and restoration |
| Migrations | Source filters and activity correspondences, paginated review, conflict choices and background execution |
| Authorship | Original declarations preserved at copy time, with configurable protection and provenance |
| History | Bounded log, migration and inactive profile-version retention |

## Installation

**Requirements:** Moodle 5.3, PHP 8.3 or newer, and the database requirements of the selected Moodle release.

**From a release:** download the matching release ZIPs of both FileBank components, open **Site administration → Plugins → Install plugins**, upload the packages and follow the prompts.

**From Git:**

```bash
cd /path/to/moodle/public
git clone --branch main https://github.com/didactika/moodle-local_filebank.git local/filebank
git clone --branch main https://github.com/didactika/moodle-repository_filebank.git repository/filebank
cd ..
php admin/cli/upgrade.php --non-interactive
```

> [!IMPORTANT]
> Run [cron](https://docs.moodle.org/en/Cron) regularly to refresh the FileBank catalog, process queued migrations and clean expired history.

## Usage

1. Administrators open **Site administration → Plugins → Local plugins → FileBank**, create a profile and activate it.
2. Enable the FileBank repository and configure publication and authorship permissions.
3. Teachers open **Add files**, choose FileBank, filter the public library and select material.
4. Review the resulting files, import them and save the owning activity form.
5. For a site migration, open **Migrations**, configure source and destination rules, resolve conflicts and queue the reviewed set.

## Configuration

Settings are located at **Site administration → Plugins → Local plugins → FileBank**. Native tabs provide access to configuration, profiles, migrations and the log.

| Area | Purpose |
|---|---|
| Course profiles | Identify related courses and configure up to nine named-capture search filters |
| Publication | Choose which supported public file areas are available |
| Authorship | Preserve the original declaration, or block workflows that cannot enforce the selected protection |
| Migration wizard | Choose source activity types, folder correspondences, missing-destination creation and conflict handling |
| Retention | Limit the lifetime of logs, migration history and inactive profile versions |

The repository instance’s visible name is also used as the browser heading. Editable-with-provenance permits copying while retaining the original author in the history. Strict protection blocks workflows where later native author edits cannot be prevented.

## Troubleshooting

| Problem | Check |
|---|---|
| No material appears | Check the active profile, matching course identifiers, publication rules and source permissions |
| An expected file is absent | It may already be used in the destination, or the native control may reject its type |
| Locked material cannot be copied | The selected author policy requires protection that the workflow cannot enforce |
| A migration is blocked | Resolve the reported course, destination or file conflict in its review screen |
| A queued migration does not run | Check cron and the scheduled/ad hoc task log |

## Getting help

Open an [issue](https://github.com/didactika/moodle-local_filebank/issues) with your Moodle and PHP versions, the source activity, the destination form and the expected and actual behavior.
