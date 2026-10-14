var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * This file is part of Moodle - https://moodle.org/
 * Moodle is free software under the GNU General Public License, version 3 or later.
 *
 * Typed native event registration and target narrowing for feature controllers.
 *
 * @module local_filebank/local/listeners
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const listen = /* @__PURE__ */ __name((root, type, handler, options) => root.addEventListener(type, handler, options), "listen");
const eventElement = /* @__PURE__ */ __name((event) => {
  if (!(event.target instanceof Element)) {
    throw new TypeError("Native control event has no element target");
  }
  return event.target;
}, "eventElement");
export {
  eventElement,
  listen
};
//# sourceMappingURL=listeners.dev.js.map
