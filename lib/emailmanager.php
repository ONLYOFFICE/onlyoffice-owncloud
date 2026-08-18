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

namespace OCA\Onlyoffice;

use OCP\Mail\IEMailTemplate;
use OCP\Mail\IMailer;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IURLGenerator;
use OCP\IUserManager;

/**
 * Email manager
 *
 * @package OCA\Onlyoffice
 */
class EmailManager {
	/**
	 * Application name
	 *
	 * @var string
	 */
	private $appName;

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
	 * Mailer
	 *
	 * @var IMailer
	 */
	private $mailer;

	/**
	 * User manager
	 *
	 * @var IUserManager
	 */
	private $userManager;

	/**
	 * Url generator service
	 *
	 * @var IURLGenerator
	 */
	private $urlGenerator;

	/**
	 * @param string $appName - application name
	 * @param IL10N $trans - l10n service
	 * @param ILogger $logger - logger
	 * @param IMailer $mailer - mailer
	 * @param IUserManager $userManager - user manager
	 * @param IURLGenerator $urlGenerator - URL generator
	 */
	public function __construct(
		$appName,
		IL10N $trans,
		ILogger $logger,
		IMailer $mailer,
		IUserManager $userManager,
		IURLGenerator $urlGenerator
	) {
		$this->appName = $appName;
		$this->trans = $trans;
		$this->logger = $logger;
		$this->mailer = $mailer;
		$this->userManager = $userManager;
		$this->urlGenerator = $urlGenerator;
	}

	/**
	 * Send notification about mention via email
	 *
	 * @param string $notifierId - id of notifier user
	 * @param string $recipientId - id of recipient user
	 * @param string $fileId - file id
	 * @param string $fileName - file name
	 * @param string $anchor - anchor
	 * @param string $notificationObjectId - object of notification
	 *
	 * @return bool
	 */
	public function notifyMentionEmail(
		string $notifierId,
		string $recipientId,
		string $fileId,
		string $fileName,
		string $anchor,
		string $notificationObjectId
	) {
		$recipient = $this->userManager->get($recipientId);
		if (empty($recipient)) {
			$this->logger->error("recipient $recipientId is null", ["app" => $this->appName]);
			return false;
		}
		$email = $recipient->getEMailAddress();
		if (empty($email)) {
			$this->logger->info("The mentioned recipient $recipientId does not have an email", ["app" => $this->appName]);
			return false;
		}
		$recipientName = $recipient->getDisplayName();

		$notifier = $this->userManager->get($notifierId);
		if (empty($notifier)) {
			$this->logger->error("notifier $notifierId is null", ["app" => $this->appName]);
			return false;
		}
		$notifierName = $notifier->getDisplayName();

		$editorLink = $this->urlGenerator->linkToRouteAbsolute(
			$this->appName . ".editor.index", [
			"fileId" => $fileId,
			"anchor" => $anchor
			]
		);
		$subject = $this->trans->t("You were mentioned in the document");
		$heading = $this->trans->t("%1\$s mentioned you in the document comment", [$notifierName]);
		$bodyHtml = $this->trans->t(
			"This is a mail message to notify that you have been mentioned by <b>%1\$s</b> in the comment to the <a href=\"%2\$s\">%3\$s</a>:<br>\"%4\$s\"",
			[$notifierName, $editorLink, $fileName, $notificationObjectId]
		);
		$this->logger->debug($bodyHtml, ["app" => $this->appName]);
		$button = [$this->trans->t("Open file"), $editorLink];
		$template = $this->buildEmailTemplate($heading, $bodyHtml, $button);
		$result = $this->sendEmailNotification($template, $email, $recipientName, $subject);
		if ($result) {
			$this->logger->info("Email to $recipientId was sent", ["app" => $this->appName]);
		}
		return $result;
	}

	/**
	 * Send notification about editors unsuccessfull check via email
	 *
	 * @param string $uid - user id
	 *
	 * @return bool
	 */
	public function notifyEditorsCheckEmail(string $uid) {
		$user = $this->userManager->get($uid);
		if (empty($user)) {
			$this->logger->error("recipient $uid is null", ["app" => $this->appName]);
			return false;
		}
		$email = $user->getEMailAddress();
		if (empty($email)) {
			$this->logger->info("The notification recipient $uid does not have an email", ["app" => $this->appName]);
			return false;
		}
		$userName = $user->getDisplayName();
		$subject = $this->trans->t("ONLYOFFICE Document Server is unavailable");
		$bodyHtml = $this->trans->t("This is a mail message to notify that the connection with the ONLYOFFICE Document Server has been lost. Please check the connection settings:");
		$appSettingsLink = $this->urlGenerator->getAbsoluteURL("/settings/admin?sectionid=additional");
		$button = [$this->trans->t("Go to Settings"), $appSettingsLink];
		$template = $this->buildEmailTemplate($subject, $bodyHtml, $button);
		$result = $this->sendEmailNotification($template, $email, $userName, $subject);
		if ($result) {
			$this->logger->info("Email to $uid was sent", ["app" => $this->appName]);
		}
		return $result;
	}


	/**
	 * Build email template
	 *
	 * @param string $heading - e-mail heading text
	 * @param string $body - e-mail body html
	 * @param array $button - params for link (0-text, 1-link)
	 *
	 * @return OC_Template
	 */
	private function buildEmailTemplate(string $heading, string $body, array $button = []) {
		$template = new \OC_Template($this->appName, 'email/notify');
		$template->assign('msgHeading', $heading);
		$template->assign('msgBody', $body);

		if (!empty($button) && isset($button[0]) && isset($button[1]) && is_string($button[0]) && is_string($button[1])) {
			$template->assign('msgButtonText', $button[0]);
			$template->assign('msgButtonLink', $button[1]);
		}
		return $template;
	}

	/**
	 * Send email
	 *
	 * @param OC_Template $template - e-mail template
	 * @param string $email - e-mail address
	 * @param string $recipientName - recipient name
	 * @param string $subject - email subject
	 *
	 * @return bool
	 */
	private function sendEmailNotification(\OC_Template $template, string $email, string $recipientName, string $subject) {
		try {
			$message = $this->mailer->createMessage();
			$message->setTo([$email => $recipientName]);
			$message->setSubject($subject);
			$msgPage = $template->fetchPage();
			$message->setHtmlBody($msgPage);
			$this->mailer->send($message);
		} catch (\Exception $e) {
			$this->logger->logException($e, ["message" => "Send email", "app" => $this->appName]);
			return false;
		}

		return true;
	}
}
