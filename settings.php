<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 * 
 * (c) Copyright Ascensio System SIA 2023
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

use OCP\User;

use OCA\Onlyoffice\Controller\SettingsController;

User::checkAdminUser();

$response = \OC::$server->query(SettingsController::class)->index();

return $response->render();
