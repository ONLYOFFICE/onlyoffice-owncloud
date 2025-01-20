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
 *	 http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
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
			$message->setHtmlBody($msgPage);
			$this->mailer->send($message);
		} catch (\Exception $e) {
			$this->logger->logException($e, ["message" => "Send email", "app" => $this->appName]);
			return false;
		}

		return true;
	}
}
