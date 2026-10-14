import{useEffect as i,useRef as c,useState as f}from"react";import{normalizeLayout as l}from"./layout";import{Fragment as m,jsx as a,jsxs as d}from"react/jsx-runtime";/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native Moodle 5.3 React layout selector with theme-overridable markup.
 *
 * @module local_filebank/ViewSelector
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function b({initialLayout:n,views:s}){const[o,u]=f(l(n)),r=c(null);return i(()=>{const e=r.current?.closest("form.filebank-browser");if(!e)return;const t=()=>u(l(e.dataset.layout||n));return t(),e.addEventListener("filebank:layoutchanged",t),()=>e.removeEventListener("filebank:layoutchanged",t)},[n]),a(m,{children:s.map((e,t)=>d("button",{ref:t===0?r:void 0,type:"button",className:`btn btn-sm btn-outline-secondary${o===e.value?" active":""}`,"data-filebank-layout":e.value,"data-filebank-react-view":"true","aria-pressed":o===e.value,title:e.label,children:[a("span",{dangerouslySetInnerHTML:{__html:e.icon}}),a("span",{className:"filebank-visually-hidden",children:e.label})]},e.value))})}export{b as default};
