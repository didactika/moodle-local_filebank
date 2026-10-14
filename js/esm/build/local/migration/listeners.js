import{listen as i}from"@moodle/lms/local_filebank/local/listeners";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Bind feature events to scoped actions without owning business state.
 *
 * @module local_filebank/local/migration/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const l=(e,t)=>{i(e,"change",t.selectionChange),i(e,"submit",t.submit),i(e,"input",t.filterInput),i(e,"click",t.navigate)};export{l as registerListeners};
