var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Serialized automatic selections and bounded review navigation through core Fragment.
 * @module local_filebank/local/migration/actions
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Selectors from "@moodle/lms/local_filebank/local/migration/selectors";
import { eventElement } from "@moodle/lms/local_filebank/local/listeners";
import { loadFragment } from "@moodle/lms/local_filebank/local/repository";
import Templates from "@moodle/lms/local_filebank/compat/templates";
import Notification from "@moodle/lms/local_filebank/compat/notification";
import { getStrings } from "@moodle/lms/core/stringUtils";
const createActions = /* @__PURE__ */ __name(async (root) => {
  const [saving, saved] = await getStrings([
    { key: "autosaving", component: "local_filebank" },
    { key: "autosaved", component: "local_filebank" }
  ]);
  let queue = Promise.resolve();
  let pending = 0;
  let failed = false;
  let canContinue = root.querySelector(Selectors.continue).getAttribute("aria-disabled") === "false";
  let searchTimer;
  let viewSequence = 0;
  let resolving = false;
  const continuation = /* @__PURE__ */ __name(() => {
    const button = root.querySelector(Selectors.continue);
    const disabled = !canContinue || pending > 0 || failed;
    button.classList.toggle("disabled", disabled);
    button.setAttribute("aria-disabled", String(disabled));
    button.tabIndex = disabled ? -1 : 0;
    root.dataset.pending = String(pending);
    root.querySelectorAll(Selectors.resolutionControls).forEach((control) => {
      control.disabled = resolving;
    });
  }, "continuation");
  const formState = /* @__PURE__ */ __name(() => {
    const form = root.querySelector(Selectors.migrationSelection);
    const data = new FormData(form);
    return {
      q: String(data.get("q") || ""),
      page: String(data.get("page") || ""),
      issuepage: String(data.get("issuepage") || ""),
      decision: String(data.get("decision") || ""),
      perpage: String(data.get("perpage") || ""),
      visible: data.getAll("visible[]").map(String),
      included: data.getAll("included[]").map(String)
    };
  }, "formState");
  const checks = /* @__PURE__ */ __name(() => [...root.querySelectorAll(Selectors.includedFiles)], "checks");
  const setPartial = /* @__PURE__ */ __name((control, included, total) => {
    control.checked = total > 0 && included === total;
    control.indeterminate = included > 0 && included < total;
  }, "setPartial");
  const patch = /* @__PURE__ */ __name((state) => {
    root.dataset.digest = state.digest;
    root.dataset.total = String(state.total);
    root.dataset.included = String(state.included);
    root.querySelectorAll(Selectors.digest).forEach((input) => {
      input.value = state.digest;
    });
    root.querySelector(Selectors.planState).textContent = state.planstate;
    root.querySelector(Selectors.includedLabel).textContent = state.includedlabel;
    root.querySelector(Selectors.empty).hidden = !state.emptycancelled;
    canContinue = state.cancontinue;
    if (pending === 1) {
      state.checks.forEach((value) => {
        const check = checks().find((input) => input.value === String(value.id));
        if (check) {
          check.checked = value.included;
          check.closest(Selectors.operation).querySelector(Selectors.excluded).hidden = value.included;
        }
      });
      state.groups.forEach((group) => {
        const selector = group.cmid ? '[data-filebank-folder="' + group.cmid + '"]' : '[data-filebank-course="' + group.courseid + '"]';
        root.querySelectorAll(selector).forEach((control) => {
          control.dataset.included = String(group.included);
          control.dataset.total = String(group.total);
          setPartial(control, group.included, group.total);
        });
      });
      const all = root.querySelector(Selectors.selectAll);
      if (all) {
        setPartial(all, state.included, state.total);
      }
    }
  }, "patch");
  const request = /* @__PURE__ */ __name((state) => {
    const sequence = state.action === "view" ? ++viewSequence : 0;
    if (state.action === "resolve") {
      resolving = true;
    }
    pending++;
    root.setAttribute("aria-busy", "true");
    const status = root.querySelector(Selectors.saveStatus);
    if (status) {
      status.textContent = saving;
    }
    continuation();
    queue = queue.then(async () => {
      if (failed) {
        return;
      }
      const payload = { ...state, planid: root.dataset.planid, digest: root.dataset.digest, sesskey: root.dataset.sesskey };
      const result = await loadFragment("migration", Number(root.dataset.contextid), {
        state: JSON.stringify(payload)
      });
      const document = new DOMParser().parseFromString(result.html, "text/html");
      const selection = document.querySelector(Selectors.selectionState);
      if (selection) {
        patch(JSON.parse(selection.dataset.filebankSelectionState));
      } else {
        if (state.action === "view" && sequence !== viewSequence) {
          return;
        }
        const next = document.querySelector(Selectors.migration);
        const open = new Map([...root.querySelectorAll("details[data-filebank-group],details[data-filebank-folder-group]")].map((element) => [
          element.dataset.filebankGroup || "folder:" + element.dataset.filebankFolderGroup,
          element.open
        ]));
        const focus = root.contains(window.document.activeElement) ? window.document.activeElement?.id : "";
        const position = window.document.activeElement?.selectionStart;
        const searchValue = root.querySelector(Selectors.migrationQ).value;
        const scroll = window.scrollY;
        await Templates.replaceNodeContents(root, next.innerHTML, result.js);
        Object.assign(root.dataset, next.dataset);
        root.dataset.ready = "true";
        canContinue = root.querySelector(Selectors.continue).getAttribute("aria-disabled") === "false";
        root.querySelectorAll(Selectors.migrationGroups).forEach((element) => {
          const key = element.dataset.filebankGroup || "folder:" + element.dataset.filebankFolderGroup;
          if (open.has(key)) {
            element.open = open.get(key);
          }
        });
        root.querySelectorAll(Selectors.partial).forEach((control) => {
          control.indeterminate = control.dataset.partial === "1";
        });
        const field = focus && window.document.getElementById(focus);
        if (field instanceof HTMLInputElement) {
          if (field.type === "search") {
            field.value = searchValue;
          }
          field.focus({ preventScroll: true });
          if (typeof position === "number" && field.type === "search") {
            field.setSelectionRange(position, position);
          }
        }
        window.scrollTo(0, scroll);
        const url = new URL(root.querySelector(Selectors.migrationSelection).action);
        const form = formState();
        ["q", "page", "decision", "issuepage", "perpage"].forEach((key) => url.searchParams.set(key, String(form[key])));
        window.history.replaceState(null, "", url);
      }
    }).catch((error) => {
      failed = true;
      Notification.exception(error);
    }).finally(() => {
      if (state.action === "resolve") {
        resolving = false;
      }
      pending--;
      continuation();
      if (!pending) {
        root.setAttribute("aria-busy", "false");
        root.dataset.saved = String(Number(root.dataset.saved || 0) + 1);
        const status2 = root.querySelector(Selectors.saveStatus);
        if (status2) {
          status2.textContent = failed ? "" : saved;
        }
      }
    });
  }, "request");
  root.querySelectorAll(Selectors.partial).forEach((control) => {
    control.indeterminate = control.dataset.partial === "1";
  });
  const selectionChange = /* @__PURE__ */ __name((event) => {
    const control = eventElement(event);
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) {
      return;
    }
    if (control.matches(Selectors.selectAll)) {
      checks().forEach((check) => {
        check.checked = control.checked;
      });
      root.querySelectorAll(Selectors.groupChecks).forEach((check) => {
        check.checked = control.checked;
        check.indeterminate = false;
      });
      request({ ...formState(), action: control.checked ? "all" : "none" });
    } else if (control.matches(Selectors.groupChecks)) {
      const folder = control.hasAttribute("data-filebank-folder");
      const courseid = folder ? control.dataset.course : control.dataset.filebankCourse;
      const cmid = folder ? control.dataset.filebankFolder : "0";
      checks().filter((check) => check.dataset.sourceCourse === courseid && (!folder || check.dataset.sourceFolder === cmid)).forEach((check) => {
        check.checked = control.checked;
      });
      request({ ...formState(), action: "group", courseid, cmid, groupincluded: control.checked ? 1 : 0 });
    } else if (control.matches(Selectors.includedFiles)) {
      control.closest(Selectors.operation).querySelector(Selectors.excluded).hidden = control.checked;
      request({ ...formState(), action: "page" });
    } else if (control.matches(Selectors.resolve) && control.value) {
      request({
        ...formState(),
        action: "resolve",
        kind: "issue",
        id: control.closest(Selectors.form).querySelector(Selectors.id).value,
        choice: control.value
      });
    } else if (control.matches(Selectors.fileResolution) && control.value) {
      request({
        ...formState(),
        action: "resolve",
        kind: "file",
        id: control.dataset.filebankFileResolution,
        choice: control.value
      });
    } else if (control.matches(Selectors.pageSize)) {
      const state = formState();
      if (control.dataset.pageparameter === "page" || control.dataset.pageparameter === "issuepage") {
        state[control.dataset.pageparameter] = 0;
      }
      request({ ...state, action: "view", perpage: control.value });
    }
  }, "selectionChange");
  const submit = /* @__PURE__ */ __name((event) => {
    if (eventElement(event).matches(Selectors.reviewSearch)) {
      event.preventDefault();
      clearTimeout(searchTimer);
      request({ ...formState(), action: "view", page: 0, q: String(new FormData(eventElement(event)).get("q") || "") });
    } else if (eventElement(event).matches(Selectors.migrationSelection)) {
      event.preventDefault();
      request({ ...formState(), action: "page" });
    }
  }, "submit");
  const filterInput = /* @__PURE__ */ __name((event) => {
    if (eventElement(event).matches(Selectors.migrationQ)) {
      viewSequence++;
      clearTimeout(searchTimer);
      const q = eventElement(event).value;
      searchTimer = setTimeout(() => request({ ...formState(), action: "view", page: 0, q }), 350);
    }
  }, "filterInput");
  const navigate = /* @__PURE__ */ __name((event) => {
    const link = eventElement(event).closest(Selectors.links);
    if (!link) {
      return;
    }
    if (link.hasAttribute("data-filebank-continue") && (pending || !canContinue || failed)) {
      event.preventDefault();
      return;
    }
    const url = new URL(link.href);
    if (url.pathname === window.location.pathname && url.searchParams.get("planid") === root.dataset.planid && url.searchParams.get("step") !== "execute") {
      event.preventDefault();
      request({
        ...formState(),
        action: "view",
        page: url.searchParams.get("page") || 0,
        q: url.searchParams.get("q") || "",
        decision: url.searchParams.get("decision") || "",
        issuepage: url.searchParams.get("issuepage") || 0
      });
    }
  }, "navigate");
  root.dataset.ready = "true";
  return { selectionChange, submit, filterInput, navigate };
}, "createActions");
export {
  createActions
};
//# sourceMappingURL=actions.dev.js.map
