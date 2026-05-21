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
			$lang = "default";
		}

		return \dirname(__DIR__) . DIRECTORY_SEPARATOR . "assets" . DIRECTORY_SEPARATOR . "document-templates" . DIRECTORY_SEPARATOR . self::$localPath[$lang] . DIRECTORY_SEPARATOR . "new" . $ext;
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
		"ca" => "ca-ES",
		"cs" => "cs-CZ",
		"da" => "da-DK",
		"de" => "de-DE",
		"de_DE" => "de-DE",
		"default" => "default",
		"el" => "el-GR",
		"en" => "en-US",
		"en_GB" => "en-GB",
		"es" => "es-ES",
		"eu" => "eu-ES",
		"fi_FI" => "fi-FI",
		"fr" => "fr-FR",
		"gl" => "gl-ES",
		"he" => "he-IL",
		"hu_HU" => "hu-HU",
		"id_ID" => "id-ID",
		"it" => "it-IT",
		"ja" => "ja-JP",
		"ko" => "ko-KR",
		"lv" => "lv-LV",
		"nb_NO" => "nb-NO",
		"nl" => "nl-NL",
		"pl" => "pl-PL",
		"pt_BR" => "pt-BR",
		"pt_PT" => "pt-PT",
		"ro" => "ro-RO",
		"ru" => "ru-RU",
		"sq" => "sq-AL",
		"si_LK" => "si-LK",
		"sk_SK" => "sk-SK",
		"sl" => "sl-SI",
		"sr" => "sr-Latn-RS",
		"sv" => "sv-SE",
		"tr" => "tr-TR",
		"uk" => "uk-UA",
		"ur_PK" => "ur-PK",
		"vi" => "vi-VN",
		"zh_CN" => "zh-CN",
		"zh_TW" => "zh-TW"
	];
}
