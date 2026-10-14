var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * form listeners.
 * @module local_filebank/local/form/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Selectors from "@moodle/lms/local_filebank/local/form/selectors";
import { listen, eventElement } from "@moodle/lms/local_filebank/local/listeners";
const registerRows = /* @__PURE__ */ __name((actions) => {
  const { wrapper } = actions;
  listen(wrapper, "input", actions.synchronize);
  listen(wrapper, "click", (event) => {
    const target = eventElement(event);
    if (target.closest(Selectors.addRow)) {
      actions.addRow();
      return;
    }
    const remove = target.closest(Selectors.removeRow);
    if (remove) {
      actions.removeRow(remove.closest(Selectors.tableRow));
    }
  });
}, "registerRows");
const registerProfile = /* @__PURE__ */ __name((actions) => {
  listen(actions.mode, "change", actions.update);
}, "registerProfile");
export {
  registerProfile,
  registerRows
};
//# sourceMappingURL=listeners.dev.js.map
