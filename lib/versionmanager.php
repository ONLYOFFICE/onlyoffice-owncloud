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

use OCP\AppFramework\QueryException;
use OCP\Files\FileInfo;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Files\IRootFolder;
use OCP\IUser;

use OCA\Files_Versions\Storage;

use OCA\Onlyoffice\Version;

/**
 * Version manager
 *
 * @package OCA\Onlyoffice
 */
class VersionManager {
	/**
	 * Application name
	 *
	 * @var string
	 */
	private $appName;

	/**
	 * Root folder
	 *
	 * @var IRootFolder
	 */
	private $rootFolder;

	/**
	 * File versions storage
	 *
	 * @var Storage
	 */
	private $storage;

	/**
	 * Version manager is available
	 *
	 * @var bool
	 */
	public $available;

	/**
	 * @param string $AppName - application name
	 * @param IRootFolder $rootFolder - root folder
	 */
	public function __construct(string $AppName, IRootFolder $rootFolder) {
		$this->appName = $AppName;
		$this->rootFolder = $rootFolder;

		if (\OC::$server->getAppManager()->isInstalled("files_versions")) {
			try {
				$this->storage = \OC::$server->query(Storage::class);
				$this->available = true;
			} catch (QueryException $e) {
				\OC::$server->getLogger()->logException($e, ["message" => "VersionManager init error", "app" => $this->appName]);
			}
		}
	}

	/**
	 * Get version folder
	 *
	 * @param IUser $user - file owner
	 *
	 * @return Folder
	 */
	private function getVersionFolder($user) {
		$userRoot = $this->rootFolder->getUserFolder($user->getUID())->getParent();
		try {
			$folder = $userRoot->get("files_versions");
			return $folder;
		} catch (NotFoundException $e) {
			\OC::$server->getLogger()->logException($e, ["message" => "VersionManager: not found user version folder " . $user->getUID(), "app" => $this->appName]);
			return null;
		}
	}

	/**
	 * Get file version
	 *
	 * @param IUser $user - file owner
	 * @param FileInfo $sourceFile - file
	 * @param integer $version - file version
	 *
	 * @return File
	 */
	public function getVersionFile($user, $sourceFile, $version) {
		$userFolder = $this->rootFolder->getUserFolder($user->getUID());
		$versionsFolder = $this->getVersionFolder($user);

		$file = $versionsFolder->get($userFolder->getRelativePath($sourceFile->getPath()) . ".v" . $version);
		return $file;
	}

	/**
	 * Get versions for file
	 *
	 * @param IUser $user - file owner
	 * @param FileInfo $file - file
	 *
	 * @return array
	 */
	public function getVersionsForFile($user, $file) {
		$versions = [];

		$fileId = $file->getId();

		try {
			$userFolder = $this->rootFolder->getUserFolder($user->getUID());
			$nodes = $userFolder->getById($fileId);
			$sourceFile = $nodes[0];
		} catch (\Exception $e) {
			\OC::$server->getLogger()->logException($e, ["message" => "VersionManager: $fileId", "app" => $this->appName]);
			return $versions;
		}

		$owner = $sourceFile->getOwner();
		if ($owner === null) {
			return $versions;
		}

		$ownerId = $owner->getUID();
		$userFolder = $this->rootFolder->getUserFolder($ownerId);
		$sourceFilePath = $userFolder->getRelativePath($sourceFile->getPath());
		$propsVersions = $this->storage->getVersions($ownerId, $sourceFilePath);

		foreach ($propsVersions as $propVersion) {
			$version = new Version(
				$propVersion["timestamp"],
				$propVersion["version"],
				$propVersion["path"],
				$file
			);

			array_push($versions, $version);
		}

		return $versions;
	}

	/**
	 * Restore version
	 *
	 * @param Version $version - version for restore
	 *
	 * @return void
	 */
	public function rollback($version) {
		$sourceFile = $version->getSourceFile();

		$ownerId = null;
		$owner = $sourceFile->getOwner();
		if (!empty($owner)) {
			$ownerId = $owner->getUID();
		}

		$path = $version->getPath();
		$revision = $version->getTimestamp();

		$versionFile = $this->getVersionFile($owner, $sourceFile, $revision);
		$versionFileInfo = $versionFile->getFileInfo();
		$versionPath = $versionFileInfo->getInternalPath();

		$this->storage->restoreVersion($ownerId, $path, $versionPath, $revision);
	}
}
