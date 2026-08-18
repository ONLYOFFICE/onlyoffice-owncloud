<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
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

namespace OCA\Onlyoffice\Cron;

use OC\BackgroundJob\TimedJob;

use OCP\AppFramework\Utility\ITimeFactory;
use OCP\IGroup;
use OCP\IGroupManager;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IURLGenerator;
use OCP\Mail\IMailer;
use OCP\IUserManager;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\DocumentService;
use OCA\Onlyoffice\EmailManager;

/**
 * Editors availability check background job
 *
 */
class EditorsCheck extends TimedJob {
	/**
	 * Application name
	 *
	 * @var string
	 */
	private $appName;

	/**
	 * Url generator service
	 *
	 * @var IURLGenerator
	 */
	private $urlGenerator;

	/**
	 * Logger
	 *
	 * @var OCP\ILogger
	 */
	private $logger;

	/**
	 * Application configuration
	 *
	 * @var AppConfig
	 */
	private $config;

	/**
	 * l10n service
	 *
	 * @var IL10N
	 */
	private $trans;

	/**
	 * Hash generator
	 *
	 * @var Crypt
	 */
	private $crypt;

	/**
	 * Group manager
	 *
	 * @var IGroupManager
	 */
	private $groupManager;

	/**
	 * Email manager
	 *
	 * @var EmailManager
	 */
	private $emailManager;

	/**
	 * @param string $AppName - application name
	 * @param IURLGenerator $urlGenerator - url generator service
	 * @param ITimeFactory $time - time
	 * @param AppConfig $config - application configuration
	 * @param IL10N $trans - l10n service
	 * @param Crypt $crypt - crypt service
	 * @param IGroupManager $groupManager - group manager
	 */
	public function __construct(
		string $AppName,
		IURLGenerator $urlGenerator,
		ITimeFactory $time,
		AppConfig $config,
		IL10N $trans,
		Crypt $crypt,
		IGroupManager $groupManager
	) {
		$this->appName = $AppName;
		$this->urlGenerator = $urlGenerator;

		$this->logger = \OC::$server->getLogger();
		$this->config = $config;
		$this->trans = $trans;
		$this->crypt = $crypt;
		$this->groupManager = $groupManager;
		$this->setInterval($this->config->getEditorsCheckInterval());
		$mailer = \OC::$server->getMailer();
		$userManager = \OC::$server->getUserManager();
		$this->emailManager = new EmailManager($AppName, $trans, $this->logger, $mailer, $userManager, $urlGenerator);
	}

	/**
	 * Makes the background check
	 *
	 * @param array $argument unused argument
	 *
	 * @return void
	 */
	protected function run($argument) {
		if (empty($this->config->getDocumentServerUrl())) {
			$this->logger->debug("Settings are empty", ["app" => $this->appName]);
			return;
		}
		if (!$this->config->settingsAreSuccessful()) {
			$this->logger->debug("Settings are not correct", ["app" => $this->appName]);
			return;
		}
		$fileUrl = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".callback.emptyfile");
		if (!$this->config->useDemo() && !empty($this->config->getStorageUrl())) {
			$fileUrl = str_replace($this->urlGenerator->getAbsoluteURL("/"), $this->config->getStorageUrl(), $fileUrl);
		}
		$host = parse_url($fileUrl)["host"];
		if ($host === "localhost" || $host === "127.0.0.1") {
			$this->logger->debug("Localhost is not alowed for cron editors availability check. Please provide server address for internal requests from ONLYOFFICE Docs", ["app" => $this->appName]);
			return;
		}

		$this->logger->debug("ONLYOFFICE check started by cron", ["app" => $this->appName]);

		$documentService = new DocumentService($this->trans, $this->config);
		list($error, $version) = $documentService->checkDocServiceUrl($this->urlGenerator, $this->crypt);
		if (!empty($error)) {
			$this->logger->info("ONLYOFFICE server is not available", ["app" => $this->appName]);
			$this->config->setSettingsError($error);
			$this->notifyAdmins();
		} else {
			$this->logger->debug("ONLYOFFICE server availability check is finished successfully", ["app" => $this->appName]);
		}
	}

	/**
	 * Get the list of users to notify
	 *
	 * @return string[]
	 */
	private function getUsersToNotify() {
		$notifyGroups = ["admin"];
		$notifyUsers = [];

		foreach ($notifyGroups as $notifyGroup) {
			$group = $this->groupManager->get($notifyGroup);
			if ($group === null || !($group instanceof IGroup)) {
				continue;
			}
			$users = $group->getUsers();
			foreach ($users as $user) {
				$notifyUsers[] = $user->getUID();
			}
		}
		return $notifyUsers;
	}

	/**
	 * Send notification to admins
	 *
	 * @return void
	 */
	private function notifyAdmins() {
		$notificationManager = \OC::$server->getNotificationManager();
		$notification = $notificationManager->createNotification();
		$notification->setApp($this->appName)
			->setDateTime(new \DateTime())
			->setObject("editorsCheck", $this->trans->t("ONLYOFFICE server is not available"))
			->setSubject("editorscheck_info");
		foreach ($this->getUsersToNotify() as $uid) {
			$notification->setUser($uid);
			$notificationManager->notify($notification);
			if ($this->config->getEmailNotifications()) {
				$this->emailManager->notifyEditorsCheckEmail($uid);
			}
		}
	}
}
