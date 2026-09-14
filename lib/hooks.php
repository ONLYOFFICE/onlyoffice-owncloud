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

use OC\Files\Filesystem;

use OCP\Util;

use OCA\Onlyoffice\FileVersions;
use OCA\Onlyoffice\KeyManager;

/**
 * The class to handle the filesystem hooks
 *
 * @package OCA\Onlyoffice
 */
class Hooks {
	/**
	 * Application name
	 *
	 * @var string
	 */
	private static $appName = "onlyoffice";

	/**
	 * Connect hooks
	 *
	 * @return void
	 */
	public static function connectHooks() {
		// Listen user deletion
		Util::connectHook("OC_User", "pre_deleteUser", Hooks::class, "userDelete");

		// Listen file change
		Util::connectHook("OC_Filesystem", "write", Hooks::class, "fileUpdate");

		// Listen file deletion
		Util::connectHook("OC_Filesystem", "delete", Hooks::class, "fileDelete");

		// Listen file version deletion
		Util::connectHook("\OCP\Versions", "preDelete", Hooks::class, "fileVersionDelete");

		// Listen file version restore
		Util::connectHook("\OCP\Versions", "rollback", Hooks::class, "fileVersionRestore");
	}

	/**
	 * Erase user file versions
	 *
	 * @param array $params - hook params
	 *
	 * @return void
	 */
	public static function userDelete($params) {
		$userId = $params["uid"];

		FileVersions::deleteAllVersions($userId);
	}

	/**
	 * Listen of file change
	 *
	 * @param array $params - hook params
	 *
	 * @return void
	 */
	public static function fileUpdate($params) {
		$filePath = $params[Filesystem::signal_param_path];
		if (empty($filePath)) {
			return;
		}

		$fileInfo = Filesystem::getFileInfo($filePath);
		if ($fileInfo === false) {
			return;
		}

		$fileId = $fileInfo->getId();

		KeyManager::delete($fileId);

		\OC::$server->getLogger()->debug("Hook fileUpdate " . json_encode($params), ["app" => self::$appName]);
	}

	/**
	 * Erase versions of deleted file
	 *
	 * @param array $params - hook params
	 *
	 * @return void
	 */
	public static function fileDelete($params) {
		$filePath = $params[Filesystem::signal_param_path];
		if (empty($filePath)) {
			return;
		}

		try {
			$ownerId = Filesystem::getOwner($filePath);

			$fileInfo = Filesystem::getFileInfo($filePath);
			if ($fileInfo === false) {
				return;
			}

			$fileId = $fileInfo->getId();

			KeyManager::delete($fileId, true);

			FileVersions::deleteAllVersions($ownerId, $fileId);
		} catch (\Exception $e) {
			\OC::$server->getLogger()->logException($e, ["message" => "Hook: fileDelete " . json_encode($params), "app" => self::$appName]);
		}
	}
	
	/**
	 * Erase versions of deleted version of file
	 *
	 * @param array $params - hook param
	 *
	 * @return void
	 */
	public static function fileVersionDelete($params) {
		$pathVersion = $params["path"];
		if (empty($pathVersion)) {
			return;
		}

		try {
			list($filePath, $versionId) = FileVersions::splitPathVersion($pathVersion);
			if (empty($filePath)) {
				return;
			}

			$ownerId = Filesystem::getOwner($filePath);

			$fileInfo = Filesystem::getFileInfo($filePath);
			if ($fileInfo === false) {
				return;
			}

			$fileId = $fileInfo->getId();

			FileVersions::deleteVersion($ownerId, $fileId, $versionId);
			FileVersions::deleteAuthor($ownerId, $fileId, $versionId);
		} catch (\Exception $e) {
			\OC::$server->getLogger()->logException($e, ["message" => "Hook: fileVersionDelete " . json_encode($params), "app" => self::$appName]);
		}
	}

	/**
	 * Erase versions of restored version of file
	 *
	 * @param array $params - hook param
	 *
	 * @return void
	 */
	public static function fileVersionRestore($params) {
		$filePath = $params["path"];
		if (empty($filePath)) {
			return;
		}

		$versionId = $params["revision"];

		try {
			$ownerId = Filesystem::getOwner($filePath);

			$fileInfo = Filesystem::getFileInfo($filePath);
			if ($fileInfo === false) {
				return;
			}

			$fileId = $fileInfo->getId();

			KeyManager::delete($fileId);

			FileVersions::deleteVersion($ownerId, $fileId, $versionId);
		} catch (\Exception $e) {
			\OC::$server->getLogger()->logException($e, ["message" => "Hook: fileVersionRestore " . json_encode($params), "app" => self::$appName]);
		}
	}
}
