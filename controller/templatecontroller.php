<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
 * (c) Copyright Ascensio System SIA 2023
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
