import e from"@moodle/lms/local_filebank/local/migration/selectors";import{createActions as o}from"@moodle/lms/local_filebank/local/migration/actions";import{registerListeners as i}from"@moodle/lms/local_filebank/local/migration/listeners";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Initialize the feature actions and event listeners.
 *
 * @module local_filebank/local/migration/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const a=async()=>{const t=document.querySelector(e.migration);if(!t||t.dataset.ready||!t.querySelector(e.migrationSelection))return;const r=await o(t);i(t,r)};export{a as init};
