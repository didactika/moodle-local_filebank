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
 * FileBank native material import integration.
 *
 * @package local_filebank
 * @copyright 2026 Didactika.org
 * @author Hector Arrechea <hectorlazaroarrechea@gmail.com>
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../lib/behat/behat_base.php');

require_once(__DIR__ . '/local_filebank_context.php');

/**
 * Focused native chooser acceptance steps.
 */
class behat_local_filebank_steps_5 extends behat_local_filebank_base {
    /**
     * Grant delegated profile management without granting site configuration.
     *
     * @Given /^the FileBank teacher can manage site profiles$/
     */
    public function grant_profile_management(): void {
        global $DB;
        $user = $DB->get_record('user', ['username' => 'cbteacher'], '*', MUST_EXIST);
        $roleid = create_role('Profile manager', 'profilemanager', '');
        assign_capability('local/filebank:manageprofiles', CAP_ALLOW, $roleid, \context_system::instance()->id);
        role_assign($roleid, $user->id, \context_system::instance()->id);
        accesslib_clear_all_caches(true);
    }

    /**
     * Enter through the actual native Add files control and repository sidebar.
     *
     * @When /^I open the native FileBank$/
     * @When /^I open the native repository "([^"]*)"$/
     * @param string $name Native repository label.
     */
    public function open_native_picker(string $name = 'FileBank'): void {
        $this->getSession()->getDriver()->executeScript(
            'const add=document.querySelector(".filemanager .fp-btn-add a");'
            . 'if(!add){throw new Error("Native Add files action is unavailable");}add.click();'
        );
        $ready = $this->getSession()->wait(
            10000,
            '[...document.querySelectorAll(".fp-repo-name")].some(node=>node.textContent.trim()===' . json_encode($name) . ')'
        );
        if (!$ready) {
            throw new \Exception('The FileBank repository was not registered in the native picker.');
        }
        $this->getSession()->getDriver()->executeScript(
            '[...document.querySelectorAll(".fp-repo-name")].find(node=>node.textContent.trim()===' . json_encode($name) . ')'
            . '.closest("a").click();'
        );
        $this->wait_for_browser();
    }

    /**
     * Open the native Tiny or Atto link browser in an existing activity description.
     *
     * @When /^I open FileBank from the activity editor$/
     */
    public function open_editor_picker(): void {
        if (
            !$this->getSession()->wait(
                10000,
                '!!document.querySelector("button[data-mce-name=tiny_link_link],button.tox-tbtn[aria-label^=Link],'
                . 'button.atto_link_button")'
            )
        ) {
            throw new \Exception('The native editor did not initialize.');
        }
        $this->getSession()->getDriver()->executeScript(
            'const button=document.querySelector("button[data-mce-name=tiny_link_link],button.tox-tbtn[aria-label^=Link],'
            . 'button.atto_link_button");'
            . 'if(!button){throw new Error("Native Link toolbar action unavailable");}button.click();'
        );
        if (!$this->getSession()->wait(10000, '!!document.querySelector(".openlinkbrowser")')) {
            throw new \Exception('The native link browser did not open.');
        }
        $this->getSession()->getDriver()->executeScript('document.querySelector(".openlinkbrowser").click();');
        $this->getSession()->wait(
            10000,
            '[...document.querySelectorAll(".fp-repo-name")].some(node=>node.textContent.trim()==="FileBank")'
        );
        $this->getSession()->getDriver()->executeScript(
            '[...document.querySelectorAll(".fp-repo-name")].find(node=>node.textContent.trim()==="FileBank")'
            . '.closest("a").click();'
        );
        $this->wait_for_browser();
    }

    /**
     * Verify batch links in the actual editor before saving its native owning form.
     *
     * @Then /^the activity editor should contain FileBank links "([^\"]*)"$/
     * @param string $names Comma-separated filenames.
     */
    public function editor_has_links(string $names): void {
        $this->getSession()->getDriver()->executeScript(
            'window.filebankEditor=null;const editable=document.getElementById("id_introeditoreditable");'
            . 'if(editable){window.filebankEditor={getBody:()=>editable};}else{require(["editor_tiny/editor"],module=>'
            . '{window.filebankEditor=module.getInstanceForElementId("id_introeditor");});}'
            . 'window.filebankReceipt=null;require(["core/ajax"],Ajax=>{Ajax.call([{methodname:"local_filebank_get_import_status",'
            . 'args:{scope:window.filebankTestScope}}])[0].then(result=>{window.filebankReceipt=result;return result;});});'
        );
        foreach (array_map('trim', explode(',', $names)) as $name) {
            if (
                !$this->getSession()->wait(
                    15000,
                    'window.filebankEditor&&[...window.filebankEditor.getBody().querySelectorAll("a[href]")]'
                    . '.some(link=>link.href.includes(' . json_encode($name) . '))'
                )
            ) {
                $receipt = $this->getSession()->getDriver()->evaluateScript(
                    'JSON.stringify({ready:window.filebankReceipt?.ready,links:window.filebankReceipt?.links,'
                    . 'files:window.filebankReceipt?.files?.map(file=>file.name),'
                    . 'error:window.filebankReceipt?.error,message:window.filebankReceipt?.message})'
                );
                throw new \Exception('A reviewed file was not inserted into the native editor: ' . $name . '; ' . $receipt);
            }
        }
    }

    /**
     * Return from the review without changing the stored selection.
     *
     * @When /^I return to FileBank selection$/
     */
    public function back_to_selection(): void {
        $this->wait_for_browser();
        $this->getSession()->getDriver()->executeScript(
            'const doc=document.querySelector(".fp-object-container").contentDocument;'
            . 'window.filebankPreviousDocument=doc;window.filebankPreviousForm=doc.querySelector(".file'
                . 'bank-browser");doc.querySelector(".filebank-back").click();'
        );
        $this->getSession()->wait(
            10000,
            'document.querySelector(".fp-object-container")?.contentDocument?.querySelector(".filebank-br'
                . 'owser")!==window.filebankPreviousForm'
        );
        $this->wait_for_browser();
    }

    /**
     * Check that a real owning activity supplies the initial source type.
     *
     * @Then /^the FileBank module filter should be "([^\"]*)"$/
     * @param string $module Expected module value.
     */
    public function module_filter_is(string $module): void {
        $this->wait_for_browser();
        if (
            !$this->getSession()->getDriver()->evaluateScript(
                'document.querySelector(".fp-object-container").contentDocument.querySelector("select[name=modul'
                . 'e]").value==='
                . json_encode($module)
            )
        ) {
            throw new \Exception('The initial module filter did not match its owning activity.');
        }
    }
}
