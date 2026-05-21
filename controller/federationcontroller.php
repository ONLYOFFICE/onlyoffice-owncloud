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

use OCP\AppFramework\OCSController;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IRequest;
use OCP\ISession;
use OCP\Share\IManager;

use OC\OCS\Result;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\DocumentService;
use OCA\Onlyoffice\FileUtility;
use OCA\Onlyoffice\KeyManager;
use OCA\Onlyoffice\RemoteInstance;

/**
 * OCS handler
 */
class FederationController extends OCSController {
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
	public $config;

	/**
	 * File utility
	 *
	 * @var FileUtility
	 */
	private $fileUtility;

	/**
	 * @param string $AppName - application name
	 * @param IRequest $request - request object
	 * @param IL10N $trans - l10n service
	 * @param ILogger $logger - logger
	 * @param IManager $shareManager - Share manager
	 * @param IManager $session - Session
	 */
	public function __construct(
		$AppName,
		IRequest $request,
		IL10N $trans,
		ILogger $logger,
		IManager $shareManager,
		ISession $session
	) {
		parent::__construct($AppName, $request);

		$this->logger = $logger;

		$this->config = new AppConfig($this->appName);
		$this->fileUtility = new FileUtility($AppName, $trans, $logger, $this->config, $shareManager, $session);
	}

	/**
	 * Returns the origin document key for editor
	 *
	 * @param string $shareToken - access token
	 * @param string $path - file path
	 *
	 * @return Result
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 * @PublicPage
	 */
	public function key($shareToken, $path) {
		list($file, $error, $share) = $this->fileUtility->getFileByToken(null, $shareToken, $path);

		if (isset($error)) {
			$this->logger->error("Federated getFileByToken: $error", ["app" => $this->appName]);
			return new Result(["error" => $error]);
		}

		$key = $this->fileUtility->getKey($file, true);

		$key = DocumentService::generateRevisionId($key);

		$this->logger->debug("Federated request get for " . $file->getId() . " key $key", ["app" => $this->appName]);

		return new Result(["key" => $key]);
	}

	/**
	 * Lock the origin document key for editor
	 *
	 * @param string $shareToken - access token
	 * @param string $path - file path
	 * @param bool $lock - status
	 * @param bool $fs - status
	 *
	 * @return Result
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 * @PublicPage
	 */
	public function keylock($shareToken, $path, $lock, $fs) {
		list($file, $error, $share) = $this->fileUtility->getFileByToken(null, $shareToken, $path);

		if (isset($error)) {
			$this->logger->error("Federated getFileByToken: $error", ["app" => $this->appName]);
			return new Result(["error" => $error]);
		}

		$fileId = $file->getId();

		if (RemoteInstance::isRemoteFile($file)) {
			$isLock = RemoteInstance::lockRemoteKey($file, $lock, $fs);
			if (!$isLock) {
				return new Result(["error" => "Failed request"]);
			}
		} else {
			KeyManager::lock($fileId, $lock);
			if (!empty($fs)) {
				KeyManager::setForcesave($fileId, $fs);
			}
		}

		$this->logger->debug("Federated request lock for " . $fileId, ["app" => $this->appName]);
		return new Result();
	}

	/**
	 * Health check instance
	 *
	 * @return Result
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 * @PublicPage
	 */
	public function healthcheck() {
		$this->logger->debug("Federated healthcheck", ["app" => $this->appName]);

		return new Result(["alive" => true]);
	}
}
