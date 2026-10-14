/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed native event registration and target narrowing for feature controllers.
 *
 * @module local_filebank/local/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const a=(e,t,n,o)=>e.addEventListener(t,n,o),r=e=>{if(!(e.target instanceof Element))throw new TypeError("Native control event has no element target");return e.target};export{r as eventElement,a as listen};
