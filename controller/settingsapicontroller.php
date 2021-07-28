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

namespace OCA\Onlyoffice\Controller;

use OCP\AppFramework\OCSController;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IRequest;
use OCP\IURLGenerator;

use OCA\Onlyoffice\AppConfig;

/**
 * Settings controller for the administration page
 */
class SettingsApiController extends OCSController {

    /**
     * Url generator service
     *
     * @var IURLGenerator
     */
    private $urlGenerator;

    /**
     * Application configuration
     *
     * @var AppConfig
     */
    private $config;

    /**
     * @param string $AppName - application name
     * @param IRequest $request - request object
     * @param IURLGenerator $urlGenerator - url generator service
     * @param AppConfig $config - application configuration
     */
    public function __construct($AppName,
                                    IRequest $request,
                                    IURLGenerator $urlGenerator,
                                    AppConfig $config
                                    ) {
        parent::__construct($AppName, $request);

        $this->urlGenerator = $urlGenerator;
        $this->config = $config;
    }

    /**
     * Get document server url
     *
     * @return JSONResponse
     *
     * @NoAdminRequired
     * @CORS
     */
    public function GetDocServerUrl() {
        $url = $this->config->GetDocumentServerUrl();
        if (!$this->config->SettingsAreSuccessful()) {
            $url = "";
        } else if (!preg_match("/^https?:\/\//i", $url)) {
            $url = $this->urlGenerator->getAbsoluteURL($url);
        }

        return new JSONResponse(["documentServerUrl" => $url]);
    }
}