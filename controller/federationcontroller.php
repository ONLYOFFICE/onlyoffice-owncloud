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
