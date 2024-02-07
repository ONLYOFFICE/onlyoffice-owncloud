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

namespace OCA\Onlyoffice;

use OCP\Files\Folder;
use OCP\Files\NotFoundException;

/**
 * Template manager
 *
 * @package OCA\Onlyoffice
 */
class TemplateManager {
	/**
	 * Application name
	 *
	 * @var string
	 */
	private static $appName = "onlyoffice";

	/**
	 * Template folder name
	 *
	 * @var string
	 */
	private static $templateFolderName = "template";

	/**
	 * Get global template directory
	 *
	 * @return Folder
	 */
	public static function getGlobalTemplateDir() {
		$dirPath = self::$appName . "/" . self::$templateFolderName;

		$rootFolder = \OC::$server->getRootFolder();
		$templateDir = null;
		try {
			$templateDir = $rootFolder->get($dirPath);
		} catch (NotFoundException $e) {
			$templateDir = $rootFolder->newFolder($dirPath);
		}

		return $templateDir;
	}

	/**
	 * Get global templates
	 *
	 * @param string $mimetype - mimetype of the template
	 *
	 * @return array
	 */
	public static function getGlobalTemplates($mimetype = null) {
		$templateDir = self::getGlobalTemplateDir();

		$templatesList = $templateDir->getDirectoryListing();
		if (!empty($mimetype)
			&& \is_array($templatesList) && \count($templatesList) > 0
		) {
			$templatesList = $templateDir->searchByMime($mimetype);
		}

		return $templatesList;
	}

	/**
	 * Get template file
	 *
	 * @param string $templateId - identifier file template
	 *
	 * @return File
	 */
	public static function getTemplate($templateId) {
		$logger = \OC::$server->getLogger();

		$templateDir = self::getGlobalTemplateDir();
		try {
			$templates = $templateDir->getById($templateId);
		} catch(\Exception $e) {
			$logger->logException($e, ["message" => "getTemplate: $templateId", "app" => self::$appName]);
			return null;
		}

		if (empty($templates)) {
			$logger->info("Template not found: $templateId", ["app" => self::$appName]);
			return null;
		}

		return $templates[0];
	}

	/**
	 * Get type template from mimetype
	 *
	 * @param string $mime - mimetype
	 *
	 * @return string
	 */
	public static function getTypeTemplate($mime) {
		switch($mime) {
			case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				return "document";
			case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				return "spreadsheet";
			case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
				return "presentation";
		}

		return "";
	}

	/**
	 * Check template type
	 *
	 * @param string $name - template name
	 *
	 * @return bool
	 */
	public static function isTemplateType($name) {
		$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
		switch($ext) {
			case "docx":
			case "xlsx":
			case "pptx":
				return true;
		}

		return false;
	}

	/**
	 * Get empty template content
	 *
	 * @param string $fileName - target file name
	 *
	 * @return string
	 */
	public static function getEmptyTemplate($fileName) {
		$ext = strtolower("." . pathinfo($fileName, PATHINFO_EXTENSION));
		$lang = \OC::$server->getL10NFactory("")->get("")->getLanguageCode();

		$templatePath = self::getEmptyTemplatePath($lang, $ext);

		$template = file_get_contents($templatePath);
		return $template;
	}

	/**
	 * Get template path
	 *
	 * @param string $lang - language
	 * @param string $ext - file extension
	 *
	 * @return string
	 */
	public static function getEmptyTemplatePath($lang, $ext) {
		if (!\array_key_exists($lang, self::$localPath)) {
			$lang = "en";
		}

		return \dirname(__DIR__) . DIRECTORY_SEPARATOR . "assets" . DIRECTORY_SEPARATOR . self::$localPath[$lang] . DIRECTORY_SEPARATOR . "new" . $ext;
	}

	/**
	 * Mapping local path to templates
	 *
	 * @var Array
	 */
	private static $localPath = [
		"ar" => "ar-SA",
		"az" => "az-Latn-AZ",
		"bg_BG" => "bg-BG",
		"cs" => "cs-CZ",
		"de" => "de-DE",
		"de_DE" => "de-DE",
		"el" => "el-GR",
		"en" => "en-US",
		"en_GB" => "en-GB",
		"es" => "es-ES",
		"eu" => "eu-ES",
		"fr" => "fr-FR",
		"gl" => "gl-ES",
		"it" => "it-IT",
		"ja" => "ja-JP",
		"ko" => "ko-KR",
		"lv" => "lv-LV",
		"nl" => "nl-NL",
		"pl" => "pl-PL",
		"pt_BR" => "pt-BR",
		"pt_PT" => "pt-PT",
		"ru" => "ru-RU",
		"si_LK" => "si-LK",
		"sk_SK" => "sk-SK",
		"sr" => "sr-Latn-RS",
		"sv" => "sv-SE",
		"tr" => "tr-TR",
		"uk" => "uk-UA",
		"vi" => "vi-VN",
		"zh_CN" => "zh-CN",
		"zh_TW" => "zh-TW"
	];
}
