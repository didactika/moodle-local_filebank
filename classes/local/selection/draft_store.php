<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Where the bindings of the native forms are kept for the length of one session.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_filebank\local\selection;

/**
 * The session cache that holds the bindings, so nothing is written to the session object itself.
 */
final class draft_store {
    /**
     * @var string Key under which the bindings of the session are kept.
     */
    private const KEY = 'scopes';

    /**
     * Every binding of this session, by token.
     *
     * @return array Bindings.
     */
    public static function all(): array {
        $scopes = self::cache()->get(self::KEY);
        return is_array($scopes) ? $scopes : [];
    }

    /**
     * Replace every binding of this session.
     *
     * @param array $scopes Bindings by token.
     */
    public static function replace(array $scopes): void {
        self::cache()->set(self::KEY, $scopes);
    }

    /**
     * One binding, if the session has it.
     *
     * @param string $token Binding token.
     * @return array|null The binding, or null when there is none.
     */
    public static function find(string $token): ?array {
        return self::all()[$token] ?? null;
    }

    /**
     * Change a binding that exists; nothing happens when the token is not in the session.
     *
     * @param string $token Binding token.
     * @param callable $change Receives the binding by reference and edits it.
     */
    public static function update(string $token, callable $change): void {
        $scopes = self::all();
        if (!isset($scopes[$token])) {
            return;
        }
        $change($scopes[$token]);
        self::replace($scopes);
    }

    /**
     * Drop a binding.
     *
     * @param string $token Binding token.
     */
    public static function forget(string $token): void {
        $scopes = self::all();
        unset($scopes[$token]);
        self::replace($scopes);
    }

    /**
     * The session cache of the plugin.
     *
     * @return \cache_session The cache.
     */
    private static function cache(): \cache_session {
        return \cache::make('local_filebank', 'drafts');
    }
}
