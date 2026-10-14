import o from"@moodle/lms/local_filebank/local/admin/selectors";import{createBulkActions as r,createHistoryActions as i}from"@moodle/lms/local_filebank/local/admin/actions";import{registerBulk as c,registerHistory as n,registerPagination as s}from"@moodle/lms/local_filebank/local/admin/listeners";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * admin controller.
 * @module local_filebank/local/admin/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const u=()=>{document.querySelectorAll(o.bulkForms).forEach(t=>{const e=r(t);e&&c(t,e)}),document.querySelectorAll(o.history).forEach(t=>{const e=i(t);e&&n(t,e)}),s()};export{u as init};
