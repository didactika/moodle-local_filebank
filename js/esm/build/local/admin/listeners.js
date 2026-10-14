import n from"@moodle/lms/local_filebank/local/admin/selectors";import{listen as o}from"@moodle/lms/local_filebank/local/listeners";import{changePage as a}from"@moodle/lms/local_filebank/local/admin/actions";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * admin listeners.
 * @module local_filebank/local/admin/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const u=(e,t)=>{const l=e.querySelector(n.selectAll);l&&o(l,"change",t.selectAllChange),e.querySelectorAll(n.bulkChecks).forEach(r=>o(r,"change",t.update)),o(e,"submit",t.submit)},m=(e,t)=>{e.querySelectorAll(n.versions).forEach(l=>o(l,"change",t.update))},p=()=>{document.body.dataset.filebankPagination||(document.body.dataset.filebankPagination="true",o(document,"change",a))};export{u as registerBulk,m as registerHistory,p as registerPagination};
