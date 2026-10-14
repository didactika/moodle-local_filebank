var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/editor/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Selectors from "@moodle/lms/local_filebank/local/selectors";
const appendLinks = /* @__PURE__ */ __name((editor, result) => {
  const linked = new Set([...editor.getBody().querySelectorAll(Selectors.links)].map((link) => link.href));
  if (result.files.some((file) => linked.has(file.url))) {
    const list = document.createElement("ul");
    result.files.filter((file) => !linked.has(file.url)).forEach((file) => {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = file.url;
      anchor.textContent = file.name;
      item.append(anchor);
      list.append(item);
    });
    if (list.children.length) {
      editor.undoManager.transact(() => {
        editor.selection.collapse(false);
        editor.insertContent(list.outerHTML);
        editor.save();
      });
    }
    return true;
  }
  return false;
}, "appendLinks");
export {
  appendLinks
};
//# sourceMappingURL=actions.dev.js.map
