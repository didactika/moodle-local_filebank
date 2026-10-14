import c from"@moodle/lms/local_filebank/local/selectors";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/editor/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const m=(t,l)=>{const r=new Set([...t.getBody().querySelectorAll(c.links)].map(e=>e.href));if(l.files.some(e=>r.has(e.url))){const e=document.createElement("ul");return l.files.filter(o=>!r.has(o.url)).forEach(o=>{const a=document.createElement("li"),n=document.createElement("a");n.href=o.url,n.textContent=o.name,a.append(n),e.append(a)}),e.children.length&&t.undoManager.transact(()=>{t.selection.collapse(!1),t.insertContent(e.outerHTML),t.save()}),!0}return!1};export{m as appendLinks};
