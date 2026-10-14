var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Native picker entry and documented embedded-chooser completion.
 *
 * @module local_filebank/local/editor/controller
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { appendLinks } from "@moodle/lms/local_filebank/local/editor/actions";
import { getImportStatus } from "@moodle/lms/local_filebank/local/repository";
import { getInstanceForElementId } from "@moodle/lms/local_filebank/compat/editor";
import Notification from "@moodle/lms/local_filebank/compat/notification";
import { getString } from "@moodle/lms/core/stringUtils";
const watch = /* @__PURE__ */ __name(async (scope, editorid) => {
  const until = Date.now() + 2e4;
  try {
    while (Date.now() < until) {
      const result = await getImportStatus(scope);
      if (!result) {
        return;
      }
      if (result.ready) {
        if (!result.links || result.files.length < 2) {
          return;
        }
        const editor = getInstanceForElementId(editorid);
        if (!editor) {
          Notification.alert("", await getString("editorimportfailed", "local_filebank"));
          return;
        }
        if (appendLinks(editor, result)) {
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (error) {
    Notification.exception(error);
  }
}, "watch");
export {
  watch
};
//# sourceMappingURL=controller.dev.js.map
