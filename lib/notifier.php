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

namespace OCA\Onlyoffice;

use OCP\IURLGenerator;
use OCP\ILogger;
use OCP\IUserManager;
use OCP\L10N\IFactory;
use OCP\Notification\INotification;
use OCP\Notification\INotifier;

/**
 * Class Notifier
 *
 * @package OCA\Onlyoffice
 */
class Notifier implements INotifier {
	/**
	 * Application name
	 *
	 * @var string
	 */
	private $appName;

	/**
	 * IFactory
	 *
	 * @var IFactory
	 */
	private $l10nFactory;

	/**
	 * Url generator service
	 *
	 * @var IURLGenerator
	 */
	private $urlGenerator;

	/**
	 * Logger
	 *
	 * @var ILogger
	 */
	private $logger;

	/**
	 * User manager
	 *
	 * @var IUserManager
	 */
	private $userManager;

	/**
	 * @param string $appName - application name
	 * @param IFactory $l10nFactory - l10n
	 * @param IURLGenerator $urlGenerator - url generator service
	 * @param ILogger $logger - logger
	 * @param IUserManager $userManager - user manager
	 */
	public function __construct(
		string $appName,
		IFactory $l10nFactory,
		IURLGenerator $urlGenerator,
		ILogger $logger,
		IUserManager $userManager
	) {
		$this->appName = $appName;
		$this->l10nFactory = $l10nFactory;
		$this->urlGenerator = $urlGenerator;
		$this->logger = $logger;
		$this->userManager = $userManager;
	}

	/**
	 * @param INotification $notification - notification object
	 * @param string $languageCode - the code of the language that should be used to prepare the notification
	 *
	 * @return INotification
	 */
	public function prepare($notification, $languageCode) {
		if ($notification->getApp() !== $this->appName) {
			throw new \InvalidArgumentException("Notification not from " . $this->appName);
		}

		$parameters = $notification->getSubjectParameters();
		$trans = $this->l10nFactory->get($this->appName, $languageCode);

		switch ($notification->getObjectType()) {
			case "editorsCheck":
				$message = $trans->t("Please check the settings to resolve the problem.");
				$appSettingsLink = $this->urlGenerator->getAbsoluteURL("/settings/admin?sectionid=additional");
				$notification->setLink($appSettingsLink);
				$notification->setParsedSubject($notification->getObjectId())
					->setIcon($this->urlGenerator->getAbsoluteURL($this->urlGenerator->imagePath($this->appName, 'app-dark.svg')));
				$notification->setParsedMessage($message);
				break;
			case "mention":
				$notifierId = $parameters["notifierId"];
				$fileId = $parameters["fileId"];
				$fileName = $parameters["fileName"];
				$anchor = $parameters["anchor"];

				$this->logger->info("Notify prepare: from $notifierId about $fileId ", ["app" => $this->appName]);

				$notifier = $this->userManager->get($notifierId);
				$notifierName = $notifier->getDisplayName();
				$trans = $this->l10nFactory->get($this->appName, $languageCode);

				$notification->setIcon($this->urlGenerator->getAbsoluteURL($this->urlGenerator->imagePath($this->appName, "app-dark.svg")));
				$notification->setParsedSubject($trans->t("%1\$s mentioned in the %2\$s: \"%3\$s\".", [$notifierName, $fileName, $notification->getObjectId()]));

				$editorLink = $this->urlGenerator->linkToRouteAbsolute(
					$this->appName . ".editor.index",
					[
					"fileId" => $fileId,
					"anchor" => $anchor
					]
				);

				$notification->setLink($editorLink);
				break;
			case "documentUnsaved":
				$fileId = $parameters["fileId"];
				$fileName = $parameters["fileName"];

				$this->logger->info("Notify prepare: unsaved document $fileId");

				$editorLink = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".editor.index", ["fileId" => $fileId]);
				$notification->setParsedSubject($trans->t("%1\$s could not be saved. Please open the file again.", [$fileName]))
					->setIcon($this->urlGenerator->getAbsoluteURL($this->urlGenerator->imagePath($this->appName, 'app-dark.svg')));
				$notification->setLink($editorLink);
				break;
			default:
				$this->logger->info("Unsupported notification object: " . $notification->getObjectType(), ["app" => $this->appName]);
		}
		return $notification;
	}
}
