var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * form controller.
 * @module local_filebank/local/form/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { createRows, createProfile } from "@moodle/lms/local_filebank/local/form/actions";
import { registerRows, registerProfile } from "@moodle/lms/local_filebank/local/form/listeners";
const init = /* @__PURE__ */ __name(async (id) => {
  const actions = await createRows(id);
  if (actions) {
    registerRows(actions);
  }
}, "init");
const profile = /* @__PURE__ */ __name(() => {
  const actions = createProfile();
  if (actions) {
    registerProfile(actions);
  }
}, "profile");
export {
  init,
  profile
};
//# sourceMappingURL=controller.dev.js.map
