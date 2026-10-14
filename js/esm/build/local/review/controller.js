import o from"@moodle/lms/local_filebank/local/review/selectors";import{createActions as t}from"@moodle/lms/local_filebank/local/review/actions";import{registerListeners as i}from"@moodle/lms/local_filebank/local/review/listeners";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Initialize the feature actions and event listeners.
 *
 * @module local_filebank/local/review/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const s=()=>{const r=document.querySelector(o.reviewForm);if(!r)return;const e=t(r);i(r,e)};export{s as init};
