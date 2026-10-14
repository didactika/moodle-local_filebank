import r from"@moodle/lms/local_filebank/local/selection/selectors";import{createActions as t}from"@moodle/lms/local_filebank/local/selection/actions";import{registerListeners as m}from"@moodle/lms/local_filebank/local/selection/listeners";import{presentation as n}from"@moodle/lms/local_filebank/local/picker/bridge";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Initialize the feature actions and event listeners.
 *
 * @module local_filebank/local/selection/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=()=>{n();const o=document.querySelector(r.selectionForm);if(!o)return;const e=t(o);m(o,e)};export{p as selection};
