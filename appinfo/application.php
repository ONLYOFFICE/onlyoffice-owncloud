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

namespace OCA\Onlyoffice\AppInfo;

use OCP\AppFramework\App;
use OCP\Files\IMimeTypeDetector;
use OCP\Util;
use OCP\IPreview;
use OCP\ITagManager;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Controller\CallbackController;
use OCA\Onlyoffice\Controller\EditorApiController;
use OCA\Onlyoffice\Controller\EditorController;
use OCA\Onlyoffice\Controller\SettingsApiController;
use OCA\Onlyoffice\Controller\SettingsController;
use OCA\Onlyoffice\Controller\TemplateController;
use OCA\Onlyoffice\Controller\WebAssetController;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\Hookhandler;
use OCA\Onlyoffice\Hooks;
use OCA\Onlyoffice\Notifier;
use OCA\Onlyoffice\Preview;

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
            function () {
                if (!empty($this->appConfig->GetDocumentServerUrl())
                    && $this->appConfig->SettingsAreSuccessful()
                    && $this->appConfig->isUserAllowedToUse()) {
                    Util::addScript("onlyoffice", "desktop");
                    Util::addScript("onlyoffice", "main");
                    Util::addScript("onlyoffice", "share");
                    Util::addScript("onlyoffice", "template");

                    if ($this->appConfig->GetSameTab()) {
                        Util::addScript("onlyoffice", "listener");
                    }

                    Util::addStyle("onlyoffice", "template");
                    Util::addStyle("onlyoffice", "main");
                }
            });

        Util::connectHook("OCP\Share", "share_link_access", Hookhandler::class, "PublicPage");

        require_once __DIR__ . "/../3rdparty/jwt/BeforeValidException.php";
        require_once __DIR__ . "/../3rdparty/jwt/ExpiredException.php";
        require_once __DIR__ . "/../3rdparty/jwt/SignatureInvalidException.php";
        require_once __DIR__ . "/../3rdparty/jwt/JWT.php";

        $container = $this->getContainer();

        $detector = $container->query(IMimeTypeDetector::class);
        $detector->getAllMappings();
        $detector->registerType("ott", "application/vnd.oasis.opendocument.text-template");
        $detector->registerType("ots", "application/vnd.oasis.opendocument.spreadsheet-template");
        $detector->registerType("otp", "application/vnd.oasis.opendocument.presentation-template");

        $previewManager = $container->query(IPreview::class);
        if ($this->appConfig->GetPreview()) {
            $previewManager->registerProvider(Preview::getMimeTypeRegex(), function() use ($container) {
                return $container->query(Preview::class);
            });
        }

        $notificationManager = \OC::$server->getNotificationManager();
        $notificationManager->registerNotifier(function () use ($appName) {
            return new Notifier(
                $appName,
                \OC::$server->getL10NFactory(),
                \OC::$server->getURLGenerator(),
                \OC::$server->getLogger(),
                \OC::$server->getUserManager()
            );
        }, function () use ($appName) {
            return [
                "id" => $appName,
                "name" => $appName,
            ];
        });

        $container->registerService("L10N", function ($c) {
            return $c->query("ServerContainer")->getL10N($c->query("AppName"));
        });

        $container->registerService("RootStorage", function ($c) {
            return $c->query("ServerContainer")->getRootFolder();
        });

        $container->registerService("UserSession", function ($c) {
            return $c->query("ServerContainer")->getUserSession();
        });

        $container->registerService("Logger", function ($c) {
            return $c->query("ServerContainer")->getLogger();
        });

        $container->registerService("URLGenerator", function ($c) {
            return $c->query("ServerContainer")->getURLGenerator();
        });


        // Controllers
        $container->registerService("SettingsController", function ($c) {
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

        $container->registerService("SettingsApiController", function ($c) {
            return new SettingsApiController(
                $c->query("AppName"),
                $c->query("Request"),
                $c->query("URLGenerator"),
                $this->appConfig
            );
        });

        $container->registerService("EditorController", function ($c) {
            return new EditorController(
                $c->query("AppName"),
                $c->query("Request"),
                $c->query("RootStorage"),
                $c->query("UserSession"),
                $c->query("ServerContainer")->getUserManager(),
                $c->query("URLGenerator"),
                $c->query("L10N"),
                $c->query("Logger"),
                $this->appConfig,
                $this->crypt,
                $c->query("IManager"),
                $c->query("Session"),
                $c->query("ServerContainer")->getGroupManager()
            );
        });

        $container->registerService("EditorApiController", function ($c) {
            return new EditorApiController(
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
                $c->get(ITagManager::class)
            );
        });

        $container->registerService("CallbackController", function ($c) {
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

        $container->registerService("TemplateController", function ($c) {
            return new TemplateController(
                $c->query("AppName"),
                $c->query("Request"),
                $c->query("L10N"),
                $c->query("Logger")
            );
        });

        $container->registerService("WebAssetController", function ($c) {
            return new WebAssetController(
                $c->query("AppName"),
                $c->query("Request"),
                $c->query("Logger")
            );
        });


        Hooks::connectHooks();
    }
}
