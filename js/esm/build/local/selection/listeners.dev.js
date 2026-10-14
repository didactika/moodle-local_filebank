var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Bind feature events to scoped actions without owning business state.
 *
 * @module local_filebank/local/selection/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { listen } from "@moodle/lms/local_filebank/local/listeners";
import Selectors from "@moodle/lms/local_filebank/local/selection/selectors";
const registerListeners = /* @__PURE__ */ __name((form, actions) => {
  listen(document, "click", actions.outsideClick);
  listen(form, "keydown", actions.escapeFilters);
  listen(form, "click", actions.openFolder);
  listen(form, "click", actions.clearFilters);
  listen(form, "click", actions.toggleCourse);
  listen(form, "input", actions.filterInput);
  listen(form, "change", actions.selectionChange);
  listen(form, "click", actions.selectCard);
  listen(form, "submit", actions.submit);
  listen(form, "click", actions.changeLayout);
  form.querySelectorAll(Selectors.options).forEach((detail) => {
    const key = "filebank-options";
    try {
      detail.open = sessionStorage.getItem(key) === "open";
    } catch (error) {
    }
    listen(detail, "toggle", () => {
      try {
        sessionStorage.setItem(key, detail.open ? "open" : "closed");
      } catch (error) {
      }
    });
  });
}, "registerListeners");
export {
  registerListeners
};
//# sourceMappingURL=listeners.dev.js.map
