var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Initialize the feature actions and event listeners.
 *
 * @module local_filebank/local/migration/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Selectors from "@moodle/lms/local_filebank/local/migration/selectors";
import { createActions } from "@moodle/lms/local_filebank/local/migration/actions";
import { registerListeners } from "@moodle/lms/local_filebank/local/migration/listeners";
const init = /* @__PURE__ */ __name(async () => {
  const root = document.querySelector(Selectors.migration);
  if (!root || root.dataset.ready || !root.querySelector(Selectors.migrationSelection)) {
    return;
  }
  const actions = await createActions(root);
  registerListeners(root, actions);
}, "init");
export {
  init
};
//# sourceMappingURL=controller.dev.js.map
