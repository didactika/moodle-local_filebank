var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native Moodle 5.3 React layout selector with theme-overridable markup.
 *
 * @module local_filebank/ViewSelector
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useRef, useState } from "react";
import { normalizeLayout } from "./layout";
function ViewSelector({ initialLayout, views }) {
  const [active, setActive] = useState(normalizeLayout(initialLayout));
  const firstButton = useRef(null);
  useEffect(() => {
    const form = firstButton.current?.closest("form.filebank-browser");
    if (!form) {
      return;
    }
    const sync = /* @__PURE__ */ __name(() => setActive(normalizeLayout(form.dataset.layout || initialLayout)), "sync");
    sync();
    form.addEventListener("filebank:layoutchanged", sync);
    return () => form.removeEventListener("filebank:layoutchanged", sync);
  }, [initialLayout]);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: views.map((view, index) => /* @__PURE__ */ jsxDEV(
    "button",
    {
      ref: index === 0 ? firstButton : void 0,
      type: "button",
      className: `btn btn-sm btn-outline-secondary${active === view.value ? " active" : ""}`,
      "data-filebank-layout": view.value,
      "data-filebank-react-view": "true",
      "aria-pressed": active === view.value,
      title: view.label,
      children: [
        /* @__PURE__ */ jsxDEV("span", { dangerouslySetInnerHTML: { __html: view.icon } }, void 0, false, {
          fileName: "public/local/filebank/js/esm/src/ViewSelector.tsx",
          lineNumber: 51,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "filebank-visually-hidden", children: view.label }, void 0, false, {
          fileName: "public/local/filebank/js/esm/src/ViewSelector.tsx",
          lineNumber: 52,
          columnNumber: 9
        }, this)
      ]
    },
    view.value,
    true,
    {
      fileName: "public/local/filebank/js/esm/src/ViewSelector.tsx",
      lineNumber: 41,
      columnNumber: 42
    },
    this
  )) }, void 0, false, {
    fileName: "public/local/filebank/js/esm/src/ViewSelector.tsx",
    lineNumber: 41,
    columnNumber: 12
  }, this);
}
__name(ViewSelector, "ViewSelector");
export {
  ViewSelector as default
};
//# sourceMappingURL=ViewSelector.dev.js.map
