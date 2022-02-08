<?php
/**
 *
 * (c) Copyright Ascensio System SIA 2022
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
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\IRequest;
use OCP\ILogger;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Crypt;

/**
 * Controller with the main functions
 */
class DirectEditorController extends OCSController {

    /**
     * Url generator service
     *
     * @var ILogger
     */
    private $logger;

    /**
     * Application configuration
     *
     * @var AppConfig
     */
    private $config;

    /**
     * Hash generator
     *
     * @var Crypt
     */
    private $crypt;

    /**
     * @param string $AppName - application name
     * @param IRequest $request - request object
     * @param IURLGenerator $urlGenerator - url generator service
     * @param AppConfig $config - application configuration
     */
    public function __construct($AppName,
                                    IRequest $request,
                                    AppConfig $config,
                                    Crypt $crypt,
                                    ILogger $logger
                                    ) {
        parent::__construct($AppName, $request);

        $this->config = $config;
        $this->crypt = $crypt;
        $this->logger = $logger;
    }

    /**
     * Print public editor section for direct open
     *
     * @param integer $fileId - file identifier
     * @param string $userId - user identifier
     *
     * @return TemplateResponse
     *
     * @NoAdminRequired
     * @PublicPage
     */
    public function open($fileId, $userId) {
        $this->logger->debug("DirectEditor open: $fileId", ["app" => $this->appName]);

        if (!$this->config->isUserAllowedToUse($userId)) {
            return $this->renderError($this->trans->t("Not permitted"));
        }

        $documentServerUrl = $this->config->GetDocumentServerUrl();

        if (empty($documentServerUrl)) {
            $this->logger->error("documentServerUrl is empty", ["app" => $this->appName]);
            return $this->renderError($this->trans->t("ONLYOFFICE app is not configured. Please contact admin"));
        }

        $directToken = $this->crypt->GetHash([
            "userId" => $userId,
            "fileId" => $fileId,
            "action" => "direct",
            "iat" => time(),
            "exp" => time() + 30
        ]);

        $params = [
            "documentServerUrl" => $documentServerUrl,
            "fileId" => null,
            "filePath" => null,
            "shareToken" => null,
            "directToken" => $directToken,
            "version" => 0,
            "template" => false,
            "inframe" => false,
            "anchor" => null
        ];

        $response = new TemplateResponse($this->appName, "editor", $params);

        $csp = new ContentSecurityPolicy();
        $csp->allowInlineScript(true);

        if (preg_match("/^https?:\/\//i", $documentServerUrl)) {
            $csp->addAllowedScriptDomain($documentServerUrl);
            $csp->addAllowedFrameDomain($documentServerUrl);
        } else {
            $csp->addAllowedFrameDomain("'self'");
        }
        $response->setContentSecurityPolicy($csp);

        return $response;
    }
}