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
 * Personal action data export and actor anonymization.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_filebank\privacy;

/**
 * Describes action provenance and handles approved personal-data requests.
 */
final class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\core_userlist_provider,
    \core_privacy\local\request\plugin\provider {
    /**
     * @var array Tables containing action actors, separate from declared authors.
     */
    private const TABLES = ['revision', 'policy', 'publish', 'author', 'origin', 'plan', 'run', 'log'];

    /**
     * Describe stored metadata.
     *
     * @param \core_privacy\local\metadata\collection $collection Metadata.
     * @return \core_privacy\local\metadata\collection Metadata.
     */
    public static function get_metadata(
        \core_privacy\local\metadata\collection $collection
    ): \core_privacy\local\metadata\collection {
        $collection->add_database_table(
            'local_filebank_revision',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        $collection->add_database_table(
            'local_filebank_policy',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        $collection->add_database_table(
            'local_filebank_publish',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        $collection->add_database_table(
            'local_filebank_author',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        $collection->add_database_table(
            'local_filebank_origin',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        $collection->add_database_table(
            'local_filebank_plan',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        $collection->add_database_table(
            'local_filebank_run',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        $collection->add_database_table(
            'local_filebank_log',
            ['userid' => 'privacy_userid'],
            'privacy_metadata'
        );
        return $collection;
    }

    /**
     * Locate user-linked governance records.
     *
     * @param int $userid User.
     * @return \core_privacy\local\request\contextlist Contexts.
     */
    public static function get_contexts_for_userid(int $userid): \core_privacy\local\request\contextlist {
        global $DB;
        $contexts = new \core_privacy\local\request\contextlist();
        foreach (self::TABLES as $suffix) {
            if ($DB->record_exists('local_filebank_' . $suffix, ['userid' => $userid])) {
                $contexts->add_system_context();
                break;
            }
        }
        return $contexts;
    }

    /**
     * Export the approved actor's records.
     *
     * @param \core_privacy\local\request\approved_contextlist $contexts Contexts.
     */
    public static function export_user_data(\core_privacy\local\request\approved_contextlist $contexts): void {
        global $DB;
        if (!in_array(\context_system::instance()->id, $contexts->get_contextids())) {
            return;
        }
        foreach (self::TABLES as $suffix) {
            $rows = $DB->get_records('local_filebank_' . $suffix, ['userid' => $contexts->get_user()->id]);
            \core_privacy\local\request\writer::with_context(\context_system::instance())
                ->export_data(
                    [get_string('pluginname', 'local_filebank'), $suffix],
                    (object)['records' => array_values($rows)]
                );
        }
    }

    /**
     * Erase actor linkage while preserving independent course material records.
     *
     * @param \core_privacy\local\request\approved_contextlist $contexts Contexts.
     */
    public static function delete_data_for_user(\core_privacy\local\request\approved_contextlist $contexts): void {
        if (in_array(\context_system::instance()->id, $contexts->get_contextids())) {
            self::erase($contexts->get_user()->id);
        }
    }

    /**
     * Erase approved actors.
     *
     * @param \core_privacy\local\request\approved_userlist $users Users.
     */
    public static function delete_data_for_users(\core_privacy\local\request\approved_userlist $users): void {
        if ($users->get_context()->contextlevel === CONTEXT_SYSTEM) {
            foreach ($users->get_userids() as $userid) {
                self::erase($userid);
            }
        }
    }

    /**
     * Erase all actor linkage in the approved system context.
     *
     * @param \context $context Context.
     */
    public static function delete_data_for_all_users_in_context(\context $context): void {
        global $DB;
        if ($context->contextlevel !== CONTEXT_SYSTEM) {
            return;
        }
        foreach (self::TABLES as $suffix) {
            if ($suffix === 'log') {
                $DB->delete_records('local_filebank_log');
            } else {
                $DB->set_field('local_filebank_' . $suffix, 'userid', 0);
            }
        }
        $DB->set_field('local_filebank_run', 'cancelled', 1);
    }

    /**
     * Discover actors in the context.
     *
     * @param \core_privacy\local\request\userlist $users Context user list.
     */
    public static function get_users_in_context(\core_privacy\local\request\userlist $users): void {
        if ($users->get_context()->contextlevel !== CONTEXT_SYSTEM) {
            return;
        }
        foreach (self::TABLES as $suffix) {
            $users->add_from_sql('userid', 'SELECT userid FROM {local_filebank_' . $suffix . '} WHERE userid > 0', []);
        }
    }

    /**
     * Remove only technical actor identity; material author is not derived from it.
     *
     * @param int $userid Actor.
     */
    private static function erase(int $userid): void {
        global $DB;
        $DB->set_field('local_filebank_run', 'cancelled', 1, ['userid' => $userid]);
        foreach (self::TABLES as $suffix) {
            if ($suffix === 'log') {
                $DB->delete_records('local_filebank_log', ['userid' => $userid]);
            } else {
                $DB->set_field('local_filebank_' . $suffix, 'userid', 0, ['userid' => $userid]);
            }
        }
    }
}
