import{listen as e}from"@moodle/lms/local_filebank/local/listeners";import s from"@moodle/lms/local_filebank/local/selection/selectors";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Bind feature events to scoped actions without owning business state.
 *
 * @module local_filebank/local/selection/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=(t,l)=>{e(document,"click",l.outsideClick),e(t,"keydown",l.escapeFilters),e(t,"click",l.openFolder),e(t,"click",l.clearFilters),e(t,"click",l.toggleCourse),e(t,"input",l.filterInput),e(t,"change",l.selectionChange),e(t,"click",l.selectCard),e(t,"submit",l.submit),e(t,"click",l.changeLayout),t.querySelectorAll(s.options).forEach(c=>{const o="filebank-options";try{c.open=sessionStorage.getItem(o)==="open"}catch{}e(c,"toggle",()=>{try{sessionStorage.setItem(o,c.open?"open":"closed")}catch{}})})};export{p as registerListeners};
