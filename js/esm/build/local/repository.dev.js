var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Authenticated backend requests shared by the typed feature actions.
 *
 * @module local_filebank/local/repository
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fetchOne } from "@moodle/lms/core/ajax";
import Fragment from "@moodle/lms/local_filebank/compat/fragment";
const loadFragment = /* @__PURE__ */ __name((name, contextid, args) => new Promise((resolve, reject) => {
  Fragment.loadFragment("local_filebank", name, contextid, args).then((html, js) => resolve({ html, js: js || "" }), reject);
}), "loadFragment");
const getImportStatus = /* @__PURE__ */ __name(async (scope) => {
  try {
    return await fetchOne({ methodname: "local_filebank_get_import_status", args: { scope } });
  } catch {
    return null;
  }
}, "getImportStatus");
export {
  getImportStatus,
  loadFragment
};
//# sourceMappingURL=repository.dev.js.map
