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

namespace OCA\Onlyoffice\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IRequest;
use OCP\IURLGenerator;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\DocumentService;
use OCA\Onlyoffice\FileVersions;
use OCA\Onlyoffice\TemplateManager;

/**
 * Settings controller for the administration page
 */
class SettingsController extends Controller {
	/**
	 * l10n service
	 *
	 * @var IL10N
	 */
	private $trans;

	/**
	 * Logger
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
	 * Url generator service
	 *
	 * @var IURLGenerator
	 */
	private $urlGenerator;

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
	 * @param IL10N $trans - l10n service
	 * @param ILogger $logger - logger
	 * @param AppConfig $config - application configuration
	 * @param Crypt $crypt - hash generator
	 */
	public function __construct(
		$AppName,
		IRequest $request,
		IURLGenerator $urlGenerator,
		IL10N $trans,
		ILogger $logger,
		AppConfig $config,
		Crypt $crypt
	) {
		parent::__construct($AppName, $request);

		$this->urlGenerator = $urlGenerator;
		$this->trans = $trans;
		$this->logger = $logger;
		$this->config = $config;
		$this->crypt = $crypt;
	}

	/**
	 * Print config section
	 *
	 * @return TemplateResponse
	 */
	public function index() {
		$data = [
			"documentserver" => $this->config->getDocumentServerUrl(true),
			"documentserverInternal" => $this->config->getDocumentServerInternalUrl(true),
			"storageUrl" => $this->config->getStorageUrl(),
			"verifyPeerOff" => $this->config->getVerifyPeerOff(),
			"secret" => $this->config->getDocumentServerSecret(true),
			"jwtHeader" => $this->config->jwtHeader(true),
			"demo" => $this->config->getDemoData(),
			"currentServer" => $this->urlGenerator->getAbsoluteURL("/"),
			"formats" => $this->config->formatsSetting(),
			"sameTab" => $this->config->getSameTab(),
			"preview" => $this->config->getPreview(),
			"cronChecker" => $this->config->getCronChecker(),
			"emailNotifications" => $this->config->getEmailNotifications(),
			"versionHistory" => $this->config->getVersionHistory(),
			"protection" => $this->config->getProtection(),
			"encryption" => $this->config->checkEncryptionModule(),
			"limitGroups" => $this->config->getLimitGroups(),
			"chat" => $this->config->getCustomizationChat(),
			"compactHeader" => $this->config->getCustomizationCompactHeader(),
			"feedback" => $this->config->getCustomizationFeedback(),
			"forcesave" => $this->config->getCustomizationForcesave(),
			"help" => $this->config->getCustomizationHelp(),
			"toolbarNoTabs" => $this->config->getCustomizationToolbarNoTabs(),
			"successful" => $this->config->settingsAreSuccessful(),
			"plugins" => $this->config->getCustomizationPlugins(),
			"macros" => $this->config->getCustomizationMacros(),
			"reviewDisplay" => $this->config->getCustomizationReviewDisplay(),
			"theme" => $this->config->getCustomizationTheme(),
			"templates" => $this->getGlobalTemplates(),
			"linkToDocs" => $this->config->getLinkToDocs(),
			"unknownAuthor" => $this->config->getUnknownAuthor()
		];
		return new TemplateResponse($this->appName, "settings", $data, "blank");
	}

	/**
	 * Save address settings
	 *
	 * @param string $documentserver - document service address
	 * @param string $documentserverInternal - document service address available from ownCloud
	 * @param string $storageUrl - ownCloud address available from document server
	 * @param bool $verifyPeerOff - parameter verification setting
	 * @param string $secret - secret key for signature
	 * @param string $jwtHeader - jwt header
	 * @param bool $demo - use demo server
	 *
	 * @return array
	 */
	public function saveAddress(
		$documentserver,
		$documentserverInternal,
		$storageUrl,
		$verifyPeerOff,
		$secret,
		$jwtHeader,
		$demo
	) {
		$error = null;
		if (!$this->config->selectDemo($demo === true)) {
			$error = $this->trans->t("The 30-day test period is over, you can no longer connect to demo ONLYOFFICE Docs server.");
		}
		if ($demo !== true) {
			$this->config->setDocumentServerUrl($documentserver);
			$this->config->setVerifyPeerOff($verifyPeerOff);
			$this->config->setDocumentServerInternalUrl($documentserverInternal);
			$this->config->setDocumentServerSecret($secret);
			$this->config->setJwtHeader($jwtHeader);
		}
		$this->config->setStorageUrl($storageUrl);

		$version = null;
		if (empty($error)) {
			$documentserver = $this->config->getDocumentServerUrl();
			if (!empty($documentserver)) {
				$documentService = new DocumentService($this->trans, $this->config);
				list($error, $version) = $documentService->checkDocServiceUrl($this->urlGenerator, $this->crypt);
				$this->config->setSettingsError($error);
			}

			if ($this->config->checkEncryptionModule() === true) {
				$this->logger->info("SaveSettings when encryption is enabled", ["app" => $this->appName]);
			}
		}

		return [
			"documentserver" => $this->config->getDocumentServerUrl(true),
			"verifyPeerOff" => $this->config->getVerifyPeerOff(),
			"documentserverInternal" => $this->config->getDocumentServerInternalUrl(true),
			"storageUrl" => $this->config->getStorageUrl(),
			"secret" => $this->config->getDocumentServerSecret(true),
			"jwtHeader" => $this->config->jwtHeader(true),
			"error" => $error,
			"version" => $version,
			];
	}

	/**
	 * Save common settings
	 *
	 * @param array $defFormats - formats array with default action
	 * @param array $editFormats - editable formats array
	 * @param bool $sameTab - open in the same tab
	 * @param bool $preview - generate preview files
	 * @param bool $cronChecker - disable cron checker
	 * @param bool $emailNotifications - notifications via e-mail
	 * @param bool $versionHistory - keep version history
	 * @param array $limitGroups - list of groups
	 * @param bool $chat - display chat
	 * @param bool $compactHeader - display compact header
	 * @param bool $feedback - display feedback
	 * @param bool $forcesave - forcesave
	 * @param bool $help - display help
	 * @param bool $toolbarNoTabs - display toolbar tab
	 * @param string $reviewDisplay - review viewing mode
	 * @param string $theme - default theme mode
	 * @param string $unknownAuthor - display unknown author
	 *
	 * @return array
	 */
	public function saveCommon(
		$defFormats,
		$editFormats,
		$sameTab,
		$preview,
		$cronChecker,
		$emailNotifications,
		$versionHistory,
		$limitGroups,
		$chat,
		$compactHeader,
		$feedback,
		$forcesave,
		$help,
		$toolbarNoTabs,
		$reviewDisplay,
		$theme,
		$unknownAuthor
	) {
		$this->config->setDefaultFormats($defFormats);
		$this->config->setEditableFormats($editFormats);
		$this->config->setSameTab($sameTab);
		$this->config->setPreview($preview);
		$this->config->setCronChecker($cronChecker);
		$this->config->setEmailNotifications($emailNotifications);
		$this->config->setVersionHistory($versionHistory);
		$this->config->setLimitGroups($limitGroups);
		$this->config->setCustomizationChat($chat);
		$this->config->setCustomizationCompactHeader($compactHeader);
		$this->config->setCustomizationFeedback($feedback);
		$this->config->setCustomizationForcesave($forcesave);
		$this->config->setCustomizationHelp($help);
		$this->config->setCustomizationToolbarNoTabs($toolbarNoTabs);
		$this->config->setCustomizationReviewDisplay($reviewDisplay);
		$this->config->setCustomizationTheme($theme);
		$this->config->setUnknownAuthor($unknownAuthor);

		return [
			];
	}

	/**
	 * Save security settings
	 *
	 * @param bool $plugins - enable plugins
	 * @param bool $macros - run document macros
	 * @param string $protection - protection
	 *
	 * @return array
	 */
	public function saveSecurity(
		$plugins,
		$macros,
		$protection
	) {
		$this->config->setCustomizationPlugins($plugins);
		$this->config->setCustomizationMacros($macros);
		$this->config->setProtection($protection);

		return [
			];
	}

	/**
	 * Clear all version history
	 *
	 * @return array
	 */
	public function clearHistory() {
		FileVersions::clearHistory();

		return [
			];
	}

	/**
	 * Get app settings
	 *
	 * @return array
	 *
	 * @NoAdminRequired
	 * @PublicPage
	 */
	public function getSettings() {
		$result = [
			"formats" => $this->config->formatsSetting(),
			"sameTab" => $this->config->getSameTab(),
			"shareAttributesVersion" => $this->config->shareAttributesVersion()
		];
		return $result;
	}

	/**
	 * Get global templates
	 *
	 * @return array
	 */
	private function getGlobalTemplates() {
		$templates = [];
		$templatesList = TemplateManager::getGlobalTemplates();

		foreach ($templatesList as $templateItem) {
			$template = [
				"id" => $templateItem->getId(),
				"name" => $templateItem->getName(),
				"type" => TemplateManager::getTypeTemplate($templateItem->getMimeType())
			];
			array_push($templates, $template);
		}

		return $templates;
	}
}
