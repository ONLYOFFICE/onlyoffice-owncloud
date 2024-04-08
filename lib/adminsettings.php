<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
 * (c) Copyright Ascensio System SIA 2024
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

namespace OCA\Onlyoffice;

use OCP\Settings\ISettings;

/**
 * Settings controller for the administration page
 */
class AdminSettings implements ISettings {
	/**
	 * Constructor
	 */
	public function __construct() {
	}

	/**
	 * Print config section
	 *
	 * @return TemplateResponse
	 */
	public function getPanel() {
		return $this->getForm();
	}

	/**
	 * Get section ID
	 *
	 * @return string
	 */
	public function getSectionID() {
		return "general";
	}

	/**
	 * Get priority order
	 *
	 * @return int
	 */
	public function getPriority() {
		return 50;
	}
}
