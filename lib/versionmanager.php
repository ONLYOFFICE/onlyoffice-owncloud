<?php
/**
 *
 * (c) Copyright Ascensio System SIA 2020
 *
 * This program is a free software product.
 * You can redistribute it and/or modify it under the terms of the GNU Affero General Public License
 * (AGPL) version 3 as published by the Free Software Foundation.
 * In accordance with Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * For details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha street, Riga, Latvia, EU, LV-1050.
 *
 * The interactive user interfaces in modified source and object code versions of the Program
 * must display Appropriate Legal Notices, as required under Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product logo when distributing the program.
 * Pursuant to Section 7(e) we decline to grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as well as technical
 * writing content are licensed under the terms of the Creative Commons Attribution-ShareAlike 4.0 International.
 * See the License terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

namespace OCA\Onlyoffice;

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
     * @param string $AppName - application name
     * @param IRootFolder $rootFolder - root folder
     */
    public function __construct(string $AppName, IRootFolder $rootFolder) {
        $this->appName = $AppName;
        $this->rootFolder = $rootFolder;

        $this->storage = \OC::$server->query(Storage::class);
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
            $this->logger->logException($e, ["message" => "VersionManager: $fileId", "app" => $this->appName]);
            return $versions;
        }

        $sourceFileName = $sourceFile->getName();
        $ownerId = $sourceFile->getOwner()->getUID();
        $propsVersions = $this->storage->getVersions($ownerId, $sourceFileName);

        foreach($propsVersions as $propVersion) {
            $version = new Version($propVersion["timestamp"],
                                    $propVersion["version"],
                                    $file);

            array_push($versions, $version);
        }

        return $versions;
    }
}
