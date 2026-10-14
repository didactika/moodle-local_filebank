import{createRows as r,createProfile as i}from"@moodle/lms/local_filebank/local/form/actions";import{registerRows as e,registerProfile as s}from"@moodle/lms/local_filebank/local/form/listeners";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * form controller.
 * @module local_filebank/local/form/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const a=async o=>{const t=await r(o);t&&e(t)},f=()=>{const o=i();o&&s(o)};export{a as init,f as profile};
