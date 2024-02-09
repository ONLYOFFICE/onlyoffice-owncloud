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

use OCP\Util;

use OCA\Onlyoffice\AppConfig;

/**
 * Class HookHandler
 *
 * @package OCA\Onlyoffice
 */
class HookHandler {
	/**
	 * Adds scripts and styles
	 *
	 * @return void
	 */
	public static function publicPage() {
		$appName = "onlyoffice";

		$appConfig = new AppConfig($appName);

		if (!empty($appConfig->getDocumentServerUrl()) && $appConfig->settingsAreSuccessful()) {
			Util::addScript("onlyoffice", "main");
			Util::addScript("onlyoffice", "share");

			if ($appConfig->getSameTab()) {
				Util::addScript("onlyoffice", "listener");
			}

			Util::addStyle("onlyoffice", "main");
		}
	}
}
