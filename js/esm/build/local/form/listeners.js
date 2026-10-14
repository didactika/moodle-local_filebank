import o from"@moodle/lms/local_filebank/local/form/selectors";import{listen as t,eventElement as c}from"@moodle/lms/local_filebank/local/listeners";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * form listeners.
 * @module local_filebank/local/form/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=e=>{const{wrapper:r}=e;t(r,"input",e.synchronize),t(r,"click",s=>{const l=c(s);if(l.closest(o.addRow)){e.addRow();return}const n=l.closest(o.removeRow);n&&e.removeRow(n.closest(o.tableRow))})},i=e=>{t(e.mode,"change",e.update)};export{i as registerProfile,p as registerRows};
