<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
 * (c) Copyright Ascensio System SIA 2025
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

use \DateInterval;
use \DateTime;

use OCP\ICache;
use OCP\ICacheFactory;
use OCP\IConfig;
use OCP\ILogger;

/**
 * Application configutarion
 *
 * @package OCA\Onlyoffice
 */
class AppConfig {
	/**
	 * Application name
	 *
	 * @var string
	 */
	private $appName;

	/**
	 * Config service
	 *
	 * @var IConfig
	 */
	private $config;

	/**
	 * Logger
	 *
	 * @var ILogger
	 */
	private $logger;

	/**
	 * The config key for the demo server
	 *
	 * @var string
	 */
	private $_demo = "demo";

	/**
	 * The config key for the document server address
	 *
	 * @var string
	 */
	private $_documentserver = "DocumentServerUrl";

	/**
	 * The config key for the document server address available from ownCloud
	 *
	 * @var string
	 */
	private $_documentserverInternal = "DocumentServerInternalUrl";

	/**
	 * The config key for the ownCloud address available from document server
	 *
	 * @var string
	 */
	private $_storageUrl = "StorageUrl";

	/**
	 * The config key for the secret key
	 *
	 * @var string
	 */
	private $_cryptSecret = "secret";

	/**
	 * The config key for the default formats
	 *
	 * @var string
	 */
	private $_defFormats = "defFormats";

	/**
	 * The config key for the editable formats
	 *
	 * @var string
	 */
	private $_editFormats = "editFormats";

	/**
	 * The config key for the setting same tab
	 *
	 * @var string
	 */
	private $_sameTab = "sameTab";

	/**
	 * The config key for the generate preview
	 *
	 * @var string
	 */
	private $_preview = "preview";

	/**
	 * The config key for the cronChecker
	 *
	 * @var string
	 */
	private $_cronChecker = "cronChecker";

	/**
	 * The config key for the e-mail notifications
	 *
	 * @var string
	 */
	private $_emailNotifications = "emailNotifications";

	/**
	 * The config key for the keep versions history
	 *
	 * @var string
	 */
	private $_versionHistory = "versionHistory";

	/**
	 * The config key for the protection
	 *
	 * @var string
	 */
	private $_protection = "protection";

	/**
	 * The config key for the chat display setting
	 *
	 * @var string
	 */
	private $_customizationChat = "customizationChat";

	/**
	 * The config key for display the header more compact setting
	 *
	 * @var string
	 */
	private $_customizationCompactHeader = "customizationCompactHeader";

	/**
	 * The config key for the feedback display setting
	 *
	 * @var string
	 */
	private $_customizationFeedback = "customizationFeedback";

	/**
	 * The config key for the forcesave setting
	 *
	 * @var string
	 */
	private $_customizationForcesave = "customizationForcesave";

	/**
	 * The config key for the help display setting
	 *
	 * @var string
	 */
	private $_customizationHelp = "customizationHelp";

	/**
	 * The config key for the no tabs setting
	 *
	 * @var string
	 */
	private $_customizationToolbarNoTabs = "customizationToolbarNoTabs";

	/**
	 * The config key for the review mode setting
	 *
	 * @var string
	 */
	private $_customizationReviewDisplay = "customizationReviewDisplay";

	/**
	 * The config key for the theme setting
	 *
	 * @var string
	 */
	private $_customizationTheme = "customizationTheme";

	/**
	 * Display name of the unknown author
	 *
	 * @var string
	 */
	private $_unknownAuthor = "unknownAuthor";

	/**
	 * The config key for the setting limit groups
	 *
	 * @var string
	 */
	private $_groups = "groups";

	/**
	 * The config key for the verification
	 *
	 * @var string
	 */
	private $_verification = "verify_peer_off";

	/**
	 * The config key for the secret key in jwt
	 *
	 * @var string
	 */
	private $_jwtSecret = "jwt_secret";

	/**
	 * The config key for the jwt header
	 *
	 * @var string
	 */
	private $_jwtHeader = "jwt_header";

	/**
	 * The config key for the allowable leeway in Jwt checks
	 *
	 * @var string
	 */
	private $_jwtLeeway = "jwt_leeway";

	/**
	 * The config key for the settings error
	 *
	 * @var string
	 */
	private $_settingsError = "settings_error";

	/**
	 * The config key for limit thumbnail size
	 *
	 * @var string
	 */
	public $limitThumbSize = "limit_thumb_size";

	/**
	 * The config key for the customer
	 *
	 * @var string
	 */
	public $customization_customer = "customization_customer";

	/**
	 * The config key for the loaderLogo
	 *
	 * @var string
	 */
	public $customization_loaderLogo = "customization_loaderLogo";

	/**
	 * The config key for the loaderName
	 *
	 * @var string
	 */
	public $customization_loaderName = "customization_loaderName";

	/**
	 * The config key for the logo
	 *
	 * @var string
	 */
	public $customization_logo = "customization_logo";

	/**
	 * The config key for the zoom
	 *
	 * @var string
	 */
	public $customization_zoom = "customization_zoom";

	/**
	 * The config key for the autosave
	 *
	 * @var string
	 */
	public $customization_autosave = "customization_autosave";

	/**
	 * The config key for the goback
	 *
	 * @var string
	 */
	public $customization_goback = "customization_goback";

	/**
	 * The config key for the macros
	 *
	 * @var string
	 */
	public $customization_macros = "customization_macros";

	/**
	 * The config key for the plugins
	 *
	 * @var string
	 */
	public $customizationPlugins = "customization_plugins";

	/**
	 * The config key for the interval of editors availability check by cron
	 *
	 * @var string
	 */
	private $_editors_check_interval = "editors_check_interval";

	/**
	 * The config key for store cache
	 *
	 * @var ICache
	 */
	private $cache;

	/**
	 * @param string $AppName - application name
	 */
	public function __construct($AppName) {
		$this->appName = $AppName;

		$this->config = \OC::$server->getConfig();
		$this->logger = \OC::$server->getLogger();
		$cacheFactory = \OC::$server->getMemCacheFactory();
		$this->cache = $cacheFactory->createLocal($this->appName);
	}

	/**
	 * Get value from the system configuration
	 *
	 * @param string $key - key configuration
	 * @param bool $system - get from root or from app section
	 *
	 * @return string
	 */
	public function getSystemValue($key, $system = false) {
		if ($system) {
			return $this->config->getSystemValue($key);
		}
		if (!empty($this->config->getSystemValue($this->appName))
			&& \array_key_exists($key, $this->config->getSystemValue($this->appName))
		) {
			return $this->config->getSystemValue($this->appName)[$key];
		}
		return null;
	}

	/**
	 * Switch on demo server
	 *
	 * @param bool $value - select demo
	 *
	 * @return bool
	 */
	public function selectDemo($value) {
		$this->logger->info("Select demo: " . json_encode($value), ["app" => $this->appName]);

		$data = $this->getDemoData();

		if ($value === true && !$data["available"]) {
			$this->logger->info("Trial demo is overdue: " . json_encode($data), ["app" => $this->appName]);
			return false;
		}

		$data["enabled"] = $value === true;
		if (!isset($data["start"])) {
			$data["start"] = new DateTime();
		}

		$this->config->setAppValue($this->appName, $this->_demo, json_encode($data));
		return true;
	}

	/**
	 * Get demo data
	 *
	 * @return array
	 */
	public function getDemoData() {
		$data = $this->config->getAppValue($this->appName, $this->_demo, "");

		if (empty($data)) {
			return [
				"available" => true,
				"enabled" => false
			];
		}
		$data = json_decode($data, true);

		$overdue = new DateTime(isset($data["start"]) ? $data["start"]["date"] : null);
		$overdue->add(new DateInterval("P" . $this->DEMO_PARAM["TRIAL"] . "D"));
		if ($overdue > new DateTime()) {
			$data["available"] = true;
			$data["enabled"] = $data["enabled"] === true;
		} else {
			$data["available"] = false;
			$data["enabled"] = false;
		}

		return $data;
	}

	/**
	 * Get status of demo server
	 *
	 * @return bool
	 */
	public function useDemo() {
		return $this->getDemoData()["enabled"] === true;
	}

	/**
	 * Save the document service address to the application configuration
	 *
	 * @param string $documentServer - document service address
	 *
	 * @return void
	 */
	public function setDocumentServerUrl($documentServer) {
		$documentServer = trim($documentServer);
		if (\strlen($documentServer) > 0) {
			$documentServer = rtrim($documentServer, "/") . "/";
			if (!preg_match("/(^https?:\/\/)|^\//i", $documentServer)) {
				$documentServer = "http://" . $documentServer;
			}
		}

		$this->logger->info("setDocumentServerUrl: $documentServer", ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_documentserver, $documentServer);
	}

	/**
	 * Get the document service address from the application configuration
	 *
	 * @param bool $origin - take origin
	 *
	 * @return string
	 */
	public function getDocumentServerUrl($origin = false) {
		if (!$origin && $this->useDemo()) {
			return $this->DEMO_PARAM["ADDR"];
		}

		$url = $this->config->getAppValue($this->appName, $this->_documentserver, "");
		if (empty($url)) {
			$url = $this->getSystemValue($this->_documentserver);
		}
		if ($url !== "/") {
			$url = rtrim($url, "/");
			if (\strlen($url) > 0) {
				$url = $url . "/";
			}
		}
		return $url;
	}

	/**
	 * Save the document service address available from ownCloud to the application configuration
	 *
	 * @param string $documentServerInternal - document service address
	 *
	 * @return void
	 */
	public function setDocumentServerInternalUrl($documentServerInternal) {
		$documentServerInternal = rtrim(trim($documentServerInternal), "/");
		if (\strlen($documentServerInternal) > 0) {
			$documentServerInternal = $documentServerInternal . "/";
			if (!preg_match("/^https?:\/\//i", $documentServerInternal)) {
				$documentServerInternal = "http://" . $documentServerInternal;
			}
		}

		$this->logger->info("setDocumentServerInternalUrl: $documentServerInternal", ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_documentserverInternal, $documentServerInternal);
	}

	/**
	 * Get the document service address available from ownCloud from the application configuration
	 *
	 * @param bool $origin - take origin
	 *
	 * @return string
	 */
	public function getDocumentServerInternalUrl($origin = false) {
		if (!$origin && $this->useDemo()) {
			return $this->getDocumentServerUrl();
		}

		$url = $this->config->getAppValue($this->appName, $this->_documentserverInternal, "");
		if (empty($url)) {
			$url = $this->getSystemValue($this->_documentserverInternal);
		}
		if (!$origin && empty($url)) {
			$url = $this->getDocumentServerUrl();
		}
		return $url;
	}

	/**
	 * Replace domain in document server url with internal address from configuration
	 *
	 * @param string $url - document server url
	 *
	 * @return string
	 */
	public function replaceDocumentServerUrlToInternal($url) {
		$documentServerUrl = $this->getDocumentServerInternalUrl();
		if (!empty($documentServerUrl)) {
			$from = $this->getDocumentServerUrl();

			if (!preg_match("/^https?:\/\//i", $from)) {
				$parsedUrl = parse_url($url);
				$from = $parsedUrl["scheme"] . "://" . $parsedUrl["host"] . (\array_key_exists("port", $parsedUrl) ? (":" . $parsedUrl["port"]) : "") . $from;
			}

			if ($from !== $documentServerUrl) {
				$this->logger->debug("Replace url from $from to $documentServerUrl", ["app" => $this->appName]);
				$url = str_replace($from, $documentServerUrl, $url);
			}
		}

		return $url;
	}

	/**
	 * Save the ownCloud address available from document server to the application configuration
	 *
	 * @param string $storageUrl - storage url
	 *
	 * @return void
	 */
	public function setStorageUrl($storageUrl) {
		$storageUrl = rtrim(trim($storageUrl), "/");
		if (\strlen($storageUrl) > 0) {
			$storageUrl = $storageUrl . "/";
			if (!preg_match("/^https?:\/\//i", $storageUrl)) {
				$storageUrl = "http://" . $storageUrl;
			}
		}

		$this->logger->info("setStorageUrl: $storageUrl", ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_storageUrl, $storageUrl);
	}

	/**
	 * Get the ownCloud address available from document server from the application configuration
	 *
	 * @return string
	 */
	public function getStorageUrl() {
		$url = $this->config->getAppValue($this->appName, $this->_storageUrl, "");
		if (empty($url)) {
			$url = $this->getSystemValue($this->_storageUrl);
		}
		return $url;
	}

	/**
	 * Save the document service secret key to the application configuration
	 *
	 * @param string $secret - secret key
	 *
	 * @return void
	 */
	public function setDocumentServerSecret($secret) {
		$secret = trim($secret);
		if (empty($secret)) {
			$this->logger->info("Clear secret key", ["app" => $this->appName]);
		} else {
			$this->logger->info("Set secret key", ["app" => $this->appName]);
		}

		$this->config->setAppValue($this->appName, $this->_jwtSecret, $secret);
	}

	/**
	 * Get the document service secret key from the application configuration
	 *
	 * @param bool $origin - take origin
	 *
	 * @return string
	 */
	public function getDocumentServerSecret($origin = false) {
		if (!$origin && $this->useDemo()) {
			return $this->DEMO_PARAM["SECRET"];
		}

		$secret = $this->config->getAppValue($this->appName, $this->_jwtSecret, "");
		if (empty($secret)) {
			$secret = $this->getSystemValue($this->_jwtSecret);
		}
		return $secret;
	}

	/**
	 * Get the secret key from the application configuration
	 *
	 * @return string
	 */
	public function getSKey() {
		$secret = $this->getDocumentServerSecret();
		if (empty($secret)) {
			$secret = $this->getSystemValue($this->_cryptSecret, true);
		}
		return $secret;
	}

	/**
	 * Save an array of formats with default action
	 *
	 * @param array $formats - formats with status
	 *
	 * @return void
	 */
	public function setDefaultFormats($formats) {
		$value = json_encode($formats);
		$this->logger->info("Set default formats: $value", ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_defFormats, $value);
	}

	/**
	 * Get an array of formats with default action
	 *
	 * @return array
	 */
	private function getDefaultFormats() {
		$value = $this->config->getAppValue($this->appName, $this->_defFormats, "");
		if (empty($value)) {
			return [];
		}
		return json_decode($value, true);
	}

	/**
	 * Save an array of formats that is opened for editing
	 *
	 * @param array $formats - formats with status
	 *
	 * @return void
	 */
	public function setEditableFormats($formats) {
		$value = json_encode($formats);
		$this->logger->info("Set editing formats: $value", ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_editFormats, $value);
	}

	/**
	 * Get an array of formats opening for editing
	 *
	 * @return array
	 */
	private function getEditableFormats() {
		$value = $this->config->getAppValue($this->appName, $this->_editFormats, "");
		if (empty($value)) {
			return [];
		}
		return json_decode($value, true);
	}

	/**
	 * Save the opening setting in a same tab
	 *
	 * @param bool $value - same tab
	 *
	 * @return void
	 */
	public function setSameTab($value) {
		$this->logger->info("Set opening in a same tab: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_sameTab, json_encode($value));
	}

	/**
	 * Get the opening setting in a same tab
	 *
	 * @return bool
	 */
	public function getSameTab() {
		return $this->config->getAppValue($this->appName, $this->_sameTab, "false") === "true";
	}

	/**
	 * Save generate preview setting
	 *
	 * @param bool $value - preview
	 *
	 * @return bool
	 */
	public function setPreview($value) {
		$this->logger->info("Set generate preview: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_preview, json_encode($value));
	}

	/**
	 * Get generate preview setting
	 *
	 * @return bool
	 */
	public function getPreview() {
		return $this->config->getAppValue($this->appName, $this->_preview, "true") === "true";
	}

	/**
	 * Get cron checker setting
	 *
	 * @return bool
	 */
	public function getCronChecker() {
		return $this->config->getAppValue($this->appName, $this->_cronChecker, "true") !== "false";
	}

	/**
	 * Save cron checker setting
	 *
	 * @param bool $value - cronChecker
	 * 
	 * @return void
	 */
	public function setCronChecker($value) {
		$this->logger->info("Set cron checker: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_cronChecker, json_encode($value));
	}

	/**
	 * Get e-mail notifications setting
	 *
	 * @return bool
	 */
	public function getEmailNotifications() {
		return $this->config->getAppValue($this->appName, $this->_emailNotifications, "true") !== "false";
	}

	/**
	 * Save e-mail notifications setting
	 *
	 * @param bool $value - emailNotifications
	 * 
	 * @return void
	 */
	public function setEmailNotifications($value) {
		$this->logger->info("Set e-mail notifications: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_emailNotifications, json_encode($value));
	}

	/**
	 * Save keep versions history
	 *
	 * @param bool $value - version history
	 *
	 * @return void
	 */
	public function setVersionHistory($value) {
		$this->logger->info("Set keep versions history: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_versionHistory, json_encode($value));
	}

	/**
	 * Get keep versions history
	 *
	 * @return bool
	 */
	public function getVersionHistory() {
		return $this->config->getAppValue($this->appName, $this->_versionHistory, "true") === "true";
	}

	/**
	 * Save protection
	 *
	 * @param bool $value - version history
	 *
	 * @return void
	 */
	public function setProtection($value) {
		$this->logger->info("Set protection: " . $value, ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_protection, $value);
	}

	/**
	 * Get protection
	 *
	 * @return string
	 */
	public function getProtection() {
		$value = $this->config->getAppValue($this->appName, $this->_protection, "owner");
		if ($value === "all") {
			return "all";
		}
		return "owner";
	}

	/**
	 * Save chat display setting
	 *
	 * @param bool $value - display chat
	 *
	 * @return void
	 */
	public function setCustomizationChat($value) {
		$this->logger->info("Set chat display: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationChat, json_encode($value));
	}

	/**
	 * Get chat display setting
	 *
	 * @return bool
	 */
	public function getCustomizationChat() {
		return $this->config->getAppValue($this->appName, $this->_customizationChat, "true") === "true";
	}

	/**
	 * Save compact header setting
	 *
	 * @param bool $value - display compact header
	 *
	 * @return void
	 */
	public function setCustomizationCompactHeader($value) {
		$this->logger->info("Set compact header display: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationCompactHeader, json_encode($value));
	}

	/**
	 * Get compact header setting
	 *
	 * @return bool
	 */
	public function getCustomizationCompactHeader() {
		return $this->config->getAppValue($this->appName, $this->_customizationCompactHeader, "true") === "true";
	}

	/**
	 * Save feedback display setting
	 *
	 * @param bool $value - display feedback
	 *
	 * @return void
	 */
	public function setCustomizationFeedback($value) {
		$this->logger->info("Set feedback display: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationFeedback, json_encode($value));
	}

	/**
	 * Get feedback display setting
	 *
	 * @return bool
	 */
	public function getCustomizationFeedback() {
		return $this->config->getAppValue($this->appName, $this->_customizationFeedback, "true") === "true";
	}

	/**
	 * Save forcesave setting
	 *
	 * @param bool $value - forcesave
	 *
	 * @return void
	 */
	public function setCustomizationForcesave($value) {
		$this->logger->info("Set forcesave: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationForcesave, json_encode($value));
	}

	/**
	 * Get forcesave setting
	 *
	 * @return bool
	 */
	public function getCustomizationForcesave() {
		$value = $this->config->getAppValue($this->appName, $this->_customizationForcesave, "false") === "true";

		return $value && ($this->checkEncryptionModule() === false);
	}

	/**
	 * Save help display setting
	 *
	 * @param bool $value - display help
	 *
	 * @return void
	 */
	public function setCustomizationHelp($value) {
		$this->logger->info("Set help display: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationHelp, json_encode($value));
	}

	/**
	 * Get help display setting
	 *
	 * @return bool
	 */
	public function getCustomizationHelp() {
		return $this->config->getAppValue($this->appName, $this->_customizationHelp, "true") === "true";
	}

	/**
	 * Save without tabs setting
	 *
	 * @param bool $value - without tabs
	 *
	 * @return void
	 */
	public function setCustomizationToolbarNoTabs($value) {
		$this->logger->info("Set without tabs: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationToolbarNoTabs, json_encode($value));
	}

	/**
	 * Get without tabs setting
	 *
	 * @return bool
	 */
	public function getCustomizationToolbarNoTabs() {
		return $this->config->getAppValue($this->appName, $this->_customizationToolbarNoTabs, "true") === "true";
	}

	/**
	 * Save review viewing mode setting
	 *
	 * @param string $value - review mode
	 *
	 * @return void
	 */
	public function setCustomizationReviewDisplay($value) {
		$this->logger->info("Set review mode: " . $value, ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationReviewDisplay, $value);
	}

	/**
	 * Get review viewing mode setting
	 *
	 * @return string
	 */
	public function getCustomizationReviewDisplay() {
		$value = $this->config->getAppValue($this->appName, $this->_customizationReviewDisplay, "original");
		if ($value === "markup") {
			return "markup";
		}
		if ($value === "final") {
			return "final";
		}
		return "original";
	}

	/**
	 * Save theme setting
	 *
	 * @param string $value - theme
	 *
	 * @return void
	 */
	public function setCustomizationTheme($value) {
		$this->logger->info("Set theme: " . $value, ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_customizationTheme, $value);
	}

	/**
	 * Get theme setting
	 *
	 * @return string
	 */
	public function getCustomizationTheme() {
		$value = $this->config->getAppValue($this->appName, $this->_customizationTheme, "theme-classic-light");
		if ($value === "theme-light") {
			return "theme-light";
		}
		if ($value === "theme-dark") {
			return "theme-dark";
		}
		return "theme-classic-light";
	}

	/**
	 * Save unknownAuthor setting
	 *
	 * @param string $value - unknown author
	 * 
	 * @return void
	 */
	public function setUnknownAuthor($value) {
		$this->logger->info("Set unknownAuthor: " . trim($value), ["app" => $this->appName]);
		$this->config->setAppValue($this->appName, $this->_unknownAuthor, trim($value));
	}

	/**
	 * Get unknownAuthor setting
	 *
	 * @return string
	 */
	public function getUnknownAuthor() {
		return $this->config->getAppValue($this->appName, $this->_unknownAuthor, "");
	}

	/**
	 * Save macros setting
	 *
	 * @param bool $value - enable macros
	 *
	 * @return void
	 */
	public function setCustomizationMacros($value) {
		$this->logger->info("Set macros enabled: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->customization_macros, json_encode($value));
	}

	/**
	 * Get macros setting
	 *
	 * @return bool
	 */
	public function getCustomizationMacros() {
		return $this->config->getAppValue($this->appName, $this->customization_macros, "true") === "true";
	}

	/**
	 * Save plugins setting
	 *
	 * @param bool $value - enable macros
	 *
	 * @return void
	 */
	public function setCustomizationPlugins($value) {
		$this->logger->info("Set plugins enabled: " . json_encode($value), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->customizationPlugins, json_encode($value));
	}

	/**
	 * Get plugins setting
	 *
	 * @return bool
	 */
	public function getCustomizationPlugins() {
		return $this->config->getAppValue($this->appName, $this->customizationPlugins, "true") === "true";
	}

	/**
	 * Save the list of groups
	 *
	 * @param array $groups - the list of groups
	 *
	 * @return void
	 */
	public function setLimitGroups($groups) {
		if (!\is_array($groups)) {
			$groups = [];
		}
		$value = json_encode($groups);
		$this->logger->info("Set groups: $value", ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_groups, $value);
	}

	/**
	 * Get the list of groups
	 *
	 * @return array
	 */
	public function getLimitGroups() {
		$value = $this->config->getAppValue($this->appName, $this->_groups, "");
		if (empty($value)) {
			return [];
		}
		$groups = json_decode($value, true);
		if (!\is_array($groups)) {
			$groups = [];
		}
		return $groups;
	}

	/**
	 * Check access for group
	 *
	 * @param string $userId - user identifier
	 *
	 * @return bool
	 */
	public function isUserAllowedToUse($userId = null) {
		// no user -> no
		$userSession = \OC::$server->getUserSession();
		if ($userId === null && ($userSession === null || !$userSession->isLoggedIn())) {
			return false;
		}

		$groups = $this->getLimitGroups();
		// no group set -> all users are allowed
		if (empty($groups)) {
			return true;
		}

		if ($userId === null) {
			$user = $userSession->getUser();
		} else {
			$user = \OC::$server->getUserManager()->get($userId);
			if (empty($user)) {
				return false;
			}
		}

		foreach ($groups as $groupName) {
			// group unknown -> error and allow nobody
			$group = \OC::$server->getGroupManager()->get($groupName);
			if ($group === null) {
				\OC::$server->getLogger()->error("Group is unknown $groupName", ["app" => $this->appName]);
				$this->setLimitGroups(array_diff($groups, [$groupName]));
			} else {
				if ($group->inGroup($user)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Save the document service verification setting to the application configuration
	 *
	 * @param bool $verifyPeerOff - parameter verification setting
	 *
	 * @return void
	 */
	public function setVerifyPeerOff($verifyPeerOff) {
		$this->logger->info("setVerifyPeerOff " . json_encode($verifyPeerOff), ["app" => $this->appName]);

		$this->config->setAppValue($this->appName, $this->_verification, json_encode($verifyPeerOff));
	}

	/**
	 * Get the document service verification setting to the application configuration
	 *
	 * @return bool
	 */
	public function getVerifyPeerOff() {
		$turnOff = $this->config->getAppValue($this->appName, $this->_verification, "");

		if (!empty($turnOff)) {
			return $turnOff === "true";
		}

		return $this->getSystemValue($this->_verification);
	}

	/**
	 * Get the limit on size document when generating thumbnails
	 *
	 * @return int
	 */
	public function getLimitThumbSize() {
		$limitSize = (integer)$this->getSystemValue($this->limitThumbSize);

		if (!empty($limitSize)) {
			return $limitSize;
		}

		return 100 * 1024 * 1024;
	}

	/**
	 * Get the jwt header setting
	 *
	 * @param bool $origin - take origin
	 *
	 * @return string
	 */
	public function jwtHeader($origin = false) {
		if (!$origin && $this->useDemo()) {
			return $this->DEMO_PARAM["HEADER"];
		}

		$header = $this->config->getAppValue($this->appName, $this->_jwtHeader, "");
		if (empty($header)) {
			$header = $this->getSystemValue($this->_jwtHeader);
		}
		if (!$origin && empty($header)) {
			$header = "Authorization";
		}
		return $header;
	}

	/**
	 * Save the jwtHeader setting
	 *
	 * @param string $value - jwtHeader
	 *
	 * @return void
	 */
	public function setJwtHeader($value) {
		$value = trim($value);
		if (empty($value)) {
			$this->logger->info("Clear header key", ["app" => $this->appName]);
		} else {
			$this->logger->info("Set header key " . $value, ["app" => $this->appName]);
		}

		$this->config->setAppValue($this->appName, $this->_jwtHeader, $value);
	}

	/**
	 * Get the Jwt Leeway
	 *
	 * @return int
	 */
	public function getJwtLeeway() {
		$jwtLeeway = (integer)$this->getSystemValue($this->_jwtLeeway);

		return $jwtLeeway;
	}

	/**
	 * Save the status settings
	 *
	 * @param string $value - error
	 *
	 * @return void
	 */
	public function setSettingsError($value) {
		$this->config->setAppValue($this->appName, $this->_settingsError, $value);
	}

	/**
	 * Get the status settings
	 *
	 * @return bool
	 */
	public function settingsAreSuccessful() {
		return empty($this->config->getAppValue($this->appName, $this->_settingsError, ""));
	}

	/**
	 * Checking encryption enabled
	 *
	 * @return string|bool
	 */
	public function checkEncryptionModule() {
		if (!\OC::$server->getAppManager()->isInstalled("encryption")) {
			return false;
		}
		if (!\OC::$server->getEncryptionManager()->isEnabled()) {
			return false;
		}

		$crypt = new \OCA\Encryption\Crypto\Crypt(\OC::$server->getLogger(), \OC::$server->getUserSession(), \OC::$server->getConfig(), \OC::$server->getL10N("encryption"));
		$util = new \OCA\Encryption\Util(new \OC\Files\View(), $crypt, \OC::$server->getLogger(), \OC::$server->getUserSession(), \OC::$server->getConfig(), \OC::$server->getUserManager());
		if ($util->isMasterKeyEnabled()) {
			return "master";
		}

		return true;
	}

	/**
	 * Get supported formats
	 *
	 * @return array
	 *
	 * @NoAdminRequired
	 */
	public function formatsSetting() {
		$result = $this->buildOnlyofficeFormats();

		$defFormats = $this->getDefaultFormats();
		foreach ($defFormats as $format => $setting) {
			if (\array_key_exists($format, $result)) {
				$result[$format]["def"] = ($setting === true || $setting === "true");
			}
		}

		$editFormats = $this->getEditableFormats();
		foreach ($editFormats as $format => $setting) {
			if (\array_key_exists($format, $result)) {
				$result[$format]["edit"] = ($setting === true || $setting === "true");
			}
		}

		return $result;
	}

	/**
	 * Get version of share attributes
	 *
	 * @return string
	 */
	public function shareAttributesVersion() {
		if (\version_compare(\implode(".", \OCP\Util::getVersion()), "10.3.0", ">=")) {
			return "v2";
		} elseif (\version_compare(\implode(".", \OCP\Util::getVersion()), "10.2.0", ">=")) {
			return "v1";
		}
		return "";
	}

	/**
	 * Get the editors check interval
	 *
	 * @return int
	 */
	public function getEditorsCheckInterval() {
		$interval = $this->getSystemValue($this->_editors_check_interval);
		if ($interval !== null && !is_int($interval)) {
			if (is_string($interval) && !ctype_digit($interval)) {
				$interval = null;
			} else {
				$interval = (integer)$interval;
			}
		}

		if (empty($interval) && $interval !== 0) {
			$interval = 60 * 60 * 24;
		}
		return (integer)$interval;
	}

	/**
	 * Get ONLYOFFICE formats list
	 *
	 * @return array
	 */
	private function buildOnlyofficeFormats() {
		try {
			$onlyofficeFormats = $this->getFormats();
			$result = [];
			$additionalFormats = $this->getAdditionalFormatAttributes();

			if ($onlyofficeFormats !== false) {
				foreach ($onlyofficeFormats as $onlyOfficeFormat) {
					if ($onlyOfficeFormat["name"]
						&& $onlyOfficeFormat["mime"]
						&& $onlyOfficeFormat["type"]
						&& $onlyOfficeFormat["actions"]
						&& $onlyOfficeFormat["convert"]
					) {
						$result[$onlyOfficeFormat["name"]] = [
							"mime" => $onlyOfficeFormat["mime"],
							"type" => $onlyOfficeFormat["type"],
							"edit" => in_array("edit", $onlyOfficeFormat["actions"]),
							"editable" => in_array("lossy-edit", $onlyOfficeFormat["actions"]),
							"conv" => in_array("auto-convert", $onlyOfficeFormat["actions"]),
							"fillForms" => in_array("fill", $onlyOfficeFormat["actions"]),
							"saveas" => $onlyOfficeFormat["convert"],
						];
						if (isset($additionalFormats[$onlyOfficeFormat["name"]])) {
							$result[$onlyOfficeFormat["name"]] = array_merge($result[$onlyOfficeFormat["name"]], $additionalFormats[$onlyOfficeFormat["name"]]);
						}
					}
				}
			}
			return $result;
		} catch (\Exception $e) {
			$this->logger->logException($e, ["message" => "Format matrix error", "app" => $this->appName]);
			return [];
		}
	}

	/**
	 * Get the additional format attributes
	 *
	 * @return array
	 */
	private function getAdditionalFormatAttributes() {
		$additionalFormatAttributes = [
			"docx" => [
				"def" => true,
				"review" => true,
				"comment" => true,
			],
			"docxf" => [
				"def" => true,
				"createForm" => true,
			],
			"oform" => [
				"def" => true,
				"createForm" => true,
			],
			"pdf" => [
				"def" => true,
			],
			"pptx" => [
				"def" => true,
				"comment" => true,
			],
			"xlsx" => [
				"def" => true,
				"comment" => true,
				"modifyFilter" => true,
			],
			"txt" => [
				"edit" => true,
			],
			"csv" => [
				"edit" => true,
			],
		];
		return $additionalFormatAttributes;
	}

	/**
	 * Get the formats list from cache or file
	 *
	 * @return array
	 */
	public function getFormats() {
		$cachedFormats = $this->cache->get("document_formats");
		if ($cachedFormats !== null) {
			return json_decode($cachedFormats, true);
		}

		$formats = file_get_contents(dirname(__DIR__) . DIRECTORY_SEPARATOR . "assets" . DIRECTORY_SEPARATOR . "document-formats" . DIRECTORY_SEPARATOR . "onlyoffice-docs-formats.json");
		$this->cache->set("document_formats", $formats, 6 * 3600);
		$this->logger->debug("Getting formats from file", ["app" => $this->appName]);
		return json_decode($formats, true);
	}

	/**
	 * Get the mime type by format name
	 *
	 * @param string $ext - format name
	 *
	 * @return string
	 */
	public function getMimeType($ext) {
		$onlyofficeFormats = $this->getFormats();
		$result = "text/plain";

		foreach ($onlyofficeFormats as $onlyOfficeFormat) {
			if ($onlyOfficeFormat["name"] === $ext && !empty($onlyOfficeFormat["mime"])) {
				$result = $onlyOfficeFormat["mime"][0];
				break;
			}
		}

		return $result;
	}

	/**
	 * DEMO DATA
	 */
	private $DEMO_PARAM = [
		"ADDR" => "https://onlinedocs.docs.onlyoffice.com/",
		"HEADER" => "AuthorizationJWT",
		"SECRET" => "sn2puSUF7muF5Jas",
		"TRIAL" => 30
	];

	private $linkToDocs = "https://www.onlyoffice.com/docs-registration.aspx?referer=owncloud";

	/**
	 * Get link to Docs Cloud
	 *
	 * @return string
	 */
	public function getLinkToDocs() {
		return $this->linkToDocs;
	}
}
