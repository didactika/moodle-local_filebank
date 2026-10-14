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

/**
 * Register a native event with its exact DOM event type.
 *
 * @param {EventTarget} root Owning node, document or window.
 * @param {string} type Native event name.
 * @param {Function} handler Handler with the event type for that name.
 * @param {Object} options Native capture, once and passive options.
 */
export const listen = <K extends keyof (GlobalEventHandlersEventMap & WindowEventMap)>(
    root: EventTarget, type: K, handler: (event: (GlobalEventHandlersEventMap & WindowEventMap)[K]) => void,
    options?: boolean | AddEventListenerOptions,
): void => root.addEventListener(type, handler as EventListener, options);

/**
 * Resolve the actual element that dispatched a native input/click event.
 *
 * @param {Event} event Native control event.
 */
export const eventElement = (event: Event): Element => {
    if (!(event.target instanceof Element)) {
        throw new TypeError('Native control event has no element target');
    }
    return event.target;
};
