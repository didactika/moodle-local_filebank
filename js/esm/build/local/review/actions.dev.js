var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Rename reviewed files through Moodle's native save/cancel modal.
 *
 * @module local_filebank/local/review/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Selectors from "@moodle/lms/local_filebank/local/review/selectors";
import { eventElement } from "@moodle/lms/local_filebank/local/listeners";
import { ModalSaveCancel, ModalEvents } from "@moodle/lms/local_filebank/compat/modal";
import { getString } from "@moodle/lms/core/stringUtils";
import Templates from "@moodle/lms/local_filebank/compat/templates";
import Notification from "@moodle/lms/local_filebank/compat/notification";
const createActions = /* @__PURE__ */ __name((form) => {
  const update = /* @__PURE__ */ __name(() => {
    const selected = [...form.querySelectorAll(Selectors.removeFiles)].filter((check) => check.checked);
    form.querySelectorAll(Selectors.reviewFolder).forEach((check) => {
      const descendants = [...check.closest(Selectors.details).querySelectorAll(Selectors.removeFiles)];
      const count = descendants.filter((file) => file.checked).length;
      check.checked = count > 0 && count === descendants.length;
      check.indeterminate = count > 0 && count < descendants.length;
    });
    const remove = document.querySelector(Selectors.removeSelected);
    remove.hidden = selected.length === 0;
    remove.disabled = selected.length === 0;
  }, "update");
  const selectionChange = /* @__PURE__ */ __name((event) => {
    const folder = eventElement(event).closest(Selectors.reviewFolder);
    if (folder) {
      folder.closest(Selectors.details).querySelectorAll(Selectors.removeFiles).forEach((check) => {
        check.checked = folder.checked;
      });
    }
    update();
  }, "selectionChange");
  const selectFile = /* @__PURE__ */ __name((event) => {
    const row = eventElement(event).closest(Selectors.reviewFile);
    if (!row || eventElement(event).closest(Selectors.interactive)) {
      return;
    }
    const check = row.querySelector(Selectors.checkbox);
    check.checked = !check.checked;
    check.dispatchEvent(new Event("change", { bubbles: true }));
  }, "selectFile");
  const renameFile = /* @__PURE__ */ __name(async (event) => {
    const button = eventElement(event).closest(Selectors.rename);
    if (!button || button.disabled) {
      return;
    }
    button.disabled = true;
    try {
      const name = button.closest(Selectors.reviewFile).querySelector(Selectors.renameField);
      const title = await getString("renamefile", "local_filebank");
      const { html, js } = await Templates.renderForPromise("local_filebank/local/selection/rename", {
        name: name.value,
        label: title
      });
      const modal = await ModalSaveCancel.create({ title, body: html, show: true, removeOnClose: true });
      modal.setTemplateJS(js);
      modal.getRoot().on(ModalEvents.save, (event2) => {
        const input = modal.getBody()[0].querySelector(Selectors.filename);
        if (!input.reportValidity()) {
          event2.preventDefault();
          return;
        }
        name.value = input.value;
        form.requestSubmit();
      });
      modal.getRoot().on(ModalEvents.hidden, () => {
        button.disabled = false;
        button.focus({ preventScroll: true });
      });
    } catch (error) {
      button.disabled = false;
      Notification.exception(error);
    }
  }, "renameFile");
  update();
  return { selectionChange, selectFile, renameFile };
}, "createActions");
export {
  createActions
};
//# sourceMappingURL=actions.dev.js.map
