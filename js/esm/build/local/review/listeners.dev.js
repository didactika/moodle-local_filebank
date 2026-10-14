var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Bind feature events to scoped actions without owning business state.
 *
 * @module local_filebank/local/review/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { listen } from "@moodle/lms/local_filebank/local/listeners";
const registerListeners = /* @__PURE__ */ __name((form, actions) => {
  listen(form, "change", actions.selectionChange);
  listen(form, "click", actions.selectFile);
  listen(form, "click", actions.renameFile);
}, "registerListeners");
export {
  registerListeners
};
//# sourceMappingURL=listeners.dev.js.map
