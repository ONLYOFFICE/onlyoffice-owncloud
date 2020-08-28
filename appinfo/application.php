<?php
/**
 *
 * (c) Copyright Ascensio System SIA 2020
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

namespace OCA\Onlyoffice\AppInfo;

use OCP\AppFramework\App;
use OCP\Util;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Controller\CallbackController;
use OCA\Onlyoffice\Controller\EditorController;
use OCA\Onlyoffice\Controller\SettingsController;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\Hookhandler;

class Application extends App {

    /**
     * Application configuration
     *
     * @var AppConfig
     */
    public $appConfig;

    /**
     * Hash generator
     *
     * @var Crypt
     */
    public $crypt;

    public function __construct(array $urlParams = []) {
        $appName = "onlyoffice";

        parent::__construct($appName, $urlParams);

        $this->appConfig = new AppConfig($appName);
        $this->crypt = new Crypt($this->appConfig);

        // Default script and style if configured
        $eventDispatcher = \OC::$server->getEventDispatcher();
        $eventDispatcher->addListener("OCA\Files::loadAdditionalScripts",
            function() {
                if (!empty($this->appConfig->GetDocumentServerUrl())
                    && $this->appConfig->SettingsAreSuccessful()
                    && $this->appConfig->isUserAllowedToUse()) {
                    Util::addScript("onlyoffice", "desktop");
                    Util::addScript("onlyoffice", "main");
                    Util::addScript("onlyoffice", "share");
                    Util::addStyle("onlyoffice", "main");
                }
            });

        Util::connectHook("OCP\Share", "share_link_access", Hookhandler::class, "PublicPage");

        require_once __DIR__ . "/../3rdparty/jwt/BeforeValidException.php";
        require_once __DIR__ . "/../3rdparty/jwt/ExpiredException.php";
        require_once __DIR__ . "/../3rdparty/jwt/SignatureInvalidException.php";
        require_once __DIR__ . "/../3rdparty/jwt/JWT.php";

        $container = $this->getContainer();

        $container->registerService("L10N", function($c) {
            return $c->query("ServerContainer")->getL10N($c->query("AppName"));
        });

        $container->registerService("RootStorage", function($c) {
            return $c->query("ServerContainer")->getRootFolder();
        });

        $container->registerService("UserSession", function($c) {
            return $c->query("ServerContainer")->getUserSession();
        });

        $container->registerService("Logger", function($c) {
            return $c->query("ServerContainer")->getLogger();
        });

        $container->registerService("URLGenerator", function($c) {
            return $c->query("ServerContainer")->getURLGenerator();
        });


        // Controllers
        $container->registerService("SettingsController", function($c) {
            return new SettingsController(
                $c->query("AppName"),
                $c->query("Request"),
                $c->query("URLGenerator"),
                $c->query("L10N"),
                $c->query("Logger"),
                $this->appConfig,
                $this->crypt
            );
        });

        $container->registerService("EditorController", function($c) {
            return new EditorController(
                $c->query("AppName"),
                $c->query("Request"),
                $c->query("RootStorage"),
                $c->query("UserSession"),
                $c->query("URLGenerator"),
                $c->query("L10N"),
                $c->query("Logger"),
                $this->appConfig,
                $this->crypt,
                $c->query("IManager"),
                $c->query("Session"),
                $c->query("ClientService")
            );
        });

        $container->registerService("CallbackController", function($c) {
            return new CallbackController(
                $c->query("AppName"),
                $c->query("Request"),
                $c->query("RootStorage"),
                $c->query("UserSession"),
                $c->query("ServerContainer")->getUserManager(),
                $c->query("L10N"),
                $c->query("Logger"),
                $this->appConfig,
                $this->crypt,
                $c->query("IManager")
            );
        });
    }
}
