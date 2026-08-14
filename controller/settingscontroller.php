<?php
/*
 * Copyright (C) Ascensio System SIA, 2009-2026
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation, together with the
 * additional terms provided in the LICENSE file.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA by email at info@onlyoffice.com
 * or by postal mail at 20A-6 Ernesta Birznieka-Upisha Street, Riga,
 * LV-1050, Latvia, European Union.
 *
 * The interactive user interfaces in modified versions of the Program
 * are required to display Appropriate Legal Notices in accordance with
 * Section 5 of the GNU AGPL version 3.
 *
 * No trademark rights are granted under this License.
 *
 * All non-code elements of the Product, including illustrations,
 * icon sets, and technical writing content, are licensed under the
 * Creative Commons Attribution-ShareAlike 4.0 International License:
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * This license applies only to such non-code elements and does not
 * modify or replace the licensing terms applicable to the Program's
 * source code, which remains licensed under the GNU Affero General
 * Public License v3.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

namespace OCA\Onlyoffice\Controller;

use OCP\AppFramework\Controller;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IRequest;
use OCP\IURLGenerator;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\DocumentService;
use OCA\Onlyoffice\FileVersions;

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
	 * @param bool $liveViewOnShare - live view on share
	 * @param bool $help - display help
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
		$liveViewOnShare,
		$help,
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
		$this->config->setLiveViewOnShare($liveViewOnShare);
		$this->config->setCustomizationHelp($help);
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
}
