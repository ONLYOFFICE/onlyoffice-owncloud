<?php
/**
 *
 * (c) Copyright Ascensio System SIA 2021
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
        $versions = array();

        $fileId = $file->getId();

        try{
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

        foreach($propsVersions as $propVersion) {
            $version = new Version($propVersion["timestamp"],
                                    $propVersion["version"],
                                    $propVersion["path"],
                                    $file);

            array_push($versions, $version);
        }

        return $versions;
    }

    /**
     * Restore version
     *
     * @param Version $version - version for restore
     *
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
