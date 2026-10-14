import n from"@moodle/lms/local_filebank/local/selectors";import{eventElement as d}from"@moodle/lms/local_filebank/local/listeners";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/picker/bridge
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=()=>{const t=document.querySelector(n.browser);if(t&&(t.dataset.filebankReady="true"),window.parent===window)return;const e=window.parent,r=[...e.document.querySelectorAll(n.hostObjects)].find(c=>c.contentDocument?.defaultView===window),o=r?.closest(".file-picker");if(!r||!o)return;window.parent.require(["local_filebank/local/picker_host"],c=>c.mount(r)),document.body.classList.add("filebank-embedded");const i=o.querySelector(n.pickerSurface),l=e.getComputedStyle(i).backgroundColor;l!=="rgba(0, 0, 0, 0)"&&document.body.style.setProperty("--filebank-host-background",l)},m=t=>{const e=document.querySelector(n.confirm),r=window.parent!==window&&window.parent.M?.core_filepicker?.select_file;e&&r&&(e.disabled=!1),document.querySelector(n.reviewForm)?.addEventListener("input",o=>{d(o).matches(n.reviewChecks)||e&&(e.disabled=!0)}),e?.addEventListener("click",()=>{if(!r)return;e.disabled=!0,t.editorid&&window.parent.require(["local_filebank/editor_import"],i=>i.watch(t.scope,t.editorid)),window.parent.M.core_filepicker.select_file(t);const o=window.parent.document.querySelector(n.nativeConfirmation);o?o.click():e.disabled=!1})};export{m as complete,p as presentation};
