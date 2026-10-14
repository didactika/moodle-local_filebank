import{requireAsync as n}from"@moodle/lms/core/amd";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed adapter for Moodle APIs without an equivalent native ESM module.
 *
 * @module local_filebank/compat/amd
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */async function r(t){const e=await n(t);return"default"in e?e.default:e}export{r as loadLegacy};
