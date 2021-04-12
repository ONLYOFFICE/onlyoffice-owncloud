<?php
/**
 *
 * (c) Copyright Ascensio System SIA 2021
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
 * handles hooks
 *
 * @package OCA\Onlyoffice
 */
class HookHandler {

    public static function PublicPage() {
        $appName = "onlyoffice";

        $appConfig = new AppConfig($appName);

        if (!empty($appConfig->GetDocumentServerUrl()) && $appConfig->SettingsAreSuccessful()) {
            Util::addScript("onlyoffice", "main");
            Util::addScript("onlyoffice", "share");

            if ($appConfig->GetSameTab()) {
                Util::addScript("onlyoffice", "listener");
            }

            Util::addStyle("onlyoffice", "main");
        }
    }
}
