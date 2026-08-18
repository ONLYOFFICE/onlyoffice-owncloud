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

namespace OCA\Onlyoffice\Controller;

use OCP\AppFramework\Controller;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IRequest;

use OCA\Onlyoffice\TemplateManager;

/**
 * Template controller for template manage
 */
class TemplateController extends Controller {
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
	 * @param string $AppName - application name
	 * @param IRequest $request - request object
	 * @param IL10N $trans - l10n service
	 * @param ILogger $logger - logger
	 */
	public function __construct(
		$AppName,
		IRequest $request,
		IL10N $trans,
		ILogger $logger
	) {
		parent::__construct($AppName, $request);

		$this->trans = $trans;
		$this->logger = $logger;
	}

	/**
	 * Get templates
	 *
	 * @return array
	 *
	 * @NoAdminRequired
	 */
	public function getTemplates() {
		$templatesList = TemplateManager::getGlobalTemplates();

		$templates = [];
		foreach ($templatesList as $templatesItem) {
			$template = [
				"id" => $templatesItem->getId(),
				"name" => $templatesItem->getName(),
				"type" => TemplateManager::getTypeTemplate($templatesItem->getMimeType())
			];
			array_push($templates, $template);
		}

		return $templates;
	}

	/**
	 * Add global template
	 *
	 * @return array
	 */
	public function addTemplate() {
		$file = $this->request->getUploadedFile("file");

		if ($file !== null) {
			if (is_uploaded_file($file["tmp_name"]) && $file["error"] === 0) {
				if (!TemplateManager::isTemplateType($file["name"])) {
					return [
						"error" => $this->trans->t("Template must be in OOXML format")
					];
				}

				$templateDir = TemplateManager::getGlobalTemplateDir();
				if ($templateDir->nodeExists($file["name"])) {
					return [
						"error" => $this->trans->t("Template already exists")
					];
				}

				$templateContent = file_get_contents($file["tmp_name"]);
				$template = $templateDir->newFile($file["name"]);
				$template->putContent($templateContent);

				$fileInfo = $template->getFileInfo();
				$result = [
					"id" => $fileInfo->getId(),
					"name" => $fileInfo->getName(),
					"type" => TemplateManager::getTypeTemplate($fileInfo->getMimeType())
				];

				$this->logger->debug("Template: added " . $fileInfo->getName(), ["app" => $this->appName]);

				return $result;
			}
		}

		return [
			"error" => $this->trans->t("Invalid file provided")
		];
	}

	/**
	 * Delete template
	 *
	 * @param string $templateId - file identifier
	 *
	 * @return array
	 */
	public function deleteTemplate($templateId) {
		$templateDir = TemplateManager::getGlobalTemplateDir();

		try {
			$templates = $templateDir->getById($templateId);
		} catch(\Exception $e) {
			$this->logger->logException($e, ["message" => "deleteTemplate: $templateId", "app" => $this->AppName]);
			return [
				"error" => $this->trans->t("Failed to delete template")
			];
		}

		if (empty($templates)) {
			$this->logger->info("Template not found: $templateId", ["app" => $this->AppName]);
			return [
				"error" => $this->trans->t("Failed to delete template")
			];
		}

		$templates[0]->delete();

		$this->logger->debug("Template: deleted " . $templates[0]->getName(), ["app" => $this->appName]);
		return [];
	}
}
