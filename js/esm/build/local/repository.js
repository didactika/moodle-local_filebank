import{fetchOne as n}from"@moodle/lms/core/ajax";import s from"@moodle/lms/local_filebank/compat/fragment";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Authenticated backend requests shared by the typed feature actions.
 *
 * @module local_filebank/local/repository
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const c=(t,e,o)=>new Promise((r,a)=>{s.loadFragment("local_filebank",t,e,o).then((m,l)=>r({html:m,js:l||""}),a)}),d=async t=>{try{return await n({methodname:"local_filebank_get_import_status",args:{scope:t}})}catch{return null}};export{d as getImportStatus,c as loadFragment};
