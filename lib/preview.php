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

use OC\Files\Meta\MetaFileVersionNode;

use OCP\Files\File;
use OCP\Files\FileInfo;
use OCP\Files\IRootFolder;
use OCP\IL10N;
use OCP\ILogger;
use OCP\Image;
use OCP\ISession;
use OCP\IURLGenerator;
use OCP\IUserManager;
use OCP\Preview\IProvider2;
use OCP\Share\IManager;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\DocumentService;
use OCA\Onlyoffice\FileUtility;
use OCA\Onlyoffice\VersionManager;

/**
 * Preview provider
 *
 * @package OCA\Onlyoffice
 */
class Preview implements IProvider2 {

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
    private $root;

    /**
     * User manager
     *
     * @var IUserManager
     */
    private $userManager;

    /**
     * Logger
     *
     * @var ILogger
     */
    private $logger;

    /**
     * l10n service
     *
     * @var IL10N
     */
    private $trans;

    /**
     * Application configuration
     *
     * @var AppConfig
     */
    private $config;

    /**
     * Url generator service
     *
     * @var IURLGenerator
     */
    private $urlGenerator;

    /**
     * Hash generator
     *
     * @var Crypt
     */
    private $crypt;

    /**
     * File version manager
     *
     * @var VersionManager
    */
    private $versionManager;

    /**
     * File utility
     *
     * @var FileUtility
     */
    private $fileUtility;

    /**
     * Capabilities mimetype
     *
     * @var Array
     */
    public static $capabilities = [
        "text/csv",
        "application/msword",
        "application/vnd.ms-word.document.macroEnabled.12",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
        "application/epub+zip",
        "text/html",
        "application/vnd.oasis.opendocument.presentation",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.presentation-template",
        "application/vnd.oasis.opendocument.spreadsheet-template",
        "application/vnd.oasis.opendocument.text-template",
        "application/pdf",
        "application/vnd.ms-powerpoint.template.macroEnabled.12",
        "application/vnd.openxmlformats-officedocument.presentationml.template",
        "application/vnd.ms-powerpoint.slideshow.macroEnabled.12",
        "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
        "application/vnd.ms-powerpoint",
        "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/rtf",
        "text/plain",
        "application/vnd.ms-excel",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.template.macroEnabled.12",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.template"
    ];

    /**
     * Converted thumbnail format
     */
    private const thumbExtension = "jpeg";

    /**
     * @param string $appName - application name
     * @param IRootFolder $root - root folder
     * @param ILogger $logger - logger
     * @param IL10N $trans - l10n service
     * @param AppConfig $config - application configuration
     * @param IURLGenerator $urlGenerator - url generator service
     * @param Crypt $crypt - hash generator
     * @param IManager $shareManager - share manager
     * @param ISession $session - session
     * @param IUserManager $userManager - user manager
     */
    public function __construct(string $appName,
                                    IRootFolder $root,
                                    ILogger $logger,
                                    IL10N $trans,
                                    AppConfig $config,
                                    IURLGenerator $urlGenerator,
                                    Crypt $crypt,
                                    IManager $shareManager,
                                    ISession $session,
                                    IUserManager $userManager
                                    ) {
        $this->appName = $appName;
        $this->root = $root;
        $this->logger = $logger;
        $this->trans = $trans;
        $this->config = $config;
        $this->urlGenerator = $urlGenerator;
        $this->crypt = $crypt;
        $this->userManager = $userManager;

        $this->versionManager = new VersionManager($appName, $root);

        $this->fileUtility = new FileUtility($appName, $trans, $logger, $config, $shareManager, $session);
    }

    /**
     * Return mime type
     */
    public static function getMimeTypeRegex() {
        $mimeTypeRegex = "";
        foreach (self::$capabilities as $format) {
            if (!empty($mimeTypeRegex)) {
                $mimeTypeRegex = $mimeTypeRegex . "|";
            }
            $mimeTypeRegex = $mimeTypeRegex . str_replace("/", "\/", $format);
        }
        $mimeTypeRegex = "/" . $mimeTypeRegex . "/";

        return $mimeTypeRegex;
    }

    /**
     * Return mime type
     */
    public function getMimeType() {
        $m = self::getMimeTypeRegex();
        return $m;
    }

    /**
     * The method checks if the file can be converted
     *
     * @param FileInfo $fileInfo - File
     *
     * @return bool
     */
    public function isAvailable(FileInfo $fileInfo) {
        if ($this->config->GetPreview() !== true) {
            return false;
        }
        if (!$fileInfo 
            || $fileInfo->getSize() === 0
            || $fileInfo->getSize() > $this->config->GetLimitThumbSize()) {
            return false;
        }
        if (!in_array($fileInfo->getMimetype(), self::$capabilities, true)) {
            return false;
        }
        return true;
    }

    /**
     * The method is generated thumbnail for file and returned image object
     *
     * @param File $file - file
     * @param int $maxX - The maximum X size of the thumbnail
     * @param int $maxY - The maximum Y size of the thumbnail
     * @param bool $scalingup - Disable/Enable upscaling of previews
     *
     * @return Image|bool false if no preview was generated
     */
    public function getThumbnail($file, $maxX, $maxY, $scalingup) {
        if (empty($file)) {
            $this->logger->error("getThumbnail is impossible. File is null", ["app" => $this->appName]);
            return false;
        }

        $this->logger->debug("getThumbnail " . $file->getPath() . " $maxX $maxY", ["app" => $this->appName]);

        list ($fileUrl, $extension, $key) = $this->getFileParam($file);
        if ($fileUrl === null || $extension === null || $key === null) {
            return false;
        }

        $imageUrl = null;
        $documentService = new DocumentService($this->trans, $this->config);
        try {
            $imageUrl = $documentService->GetConvertedUri($fileUrl, $extension, self::thumbExtension, $key);
        } catch (\Exception $e) {
            $this->logger->logException($e, ["message" => "GetConvertedUri: from $extension to " . self::thumbExtension, "app" => $this->appName]);
            return false;
        }

        try {
            $thumbnail = $documentService->Request($imageUrl);
        } catch (\Exception $e) {
            $this->logger->logException($e, ["message" => "Failed to download thumbnail", "app" => $this->appName]);
            return false;
        }

        $image = new Image();
        $image->loadFromData($thumbnail);

        if ($image->valid()) {
            $image->scaleDownToFit($maxX, $maxY);
            return $image;
        }

        return false;
    }

    /**
     * Generate secure link to download document
     *
     * @param File $file - file
     * @param IUser $user - user with access
     * @param int $version - file version
     *
     * @return string
     */
    private function getUrl($file, $user = null, $version = 0) {

        $data = [
            "action" => "download",
            "fileId" => $file->getId()
        ];

        $userId = null;
        if (!empty($user)) {
            $userId = $user->getUID();
            $data["userId"] = $userId;
        }
        if ($version > 0) {
            $data["version"] = $version;
        }

        $hashUrl = $this->crypt->GetHash($data);

        $fileUrl = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".callback.download", ["doc" => $hashUrl]);

        if (!empty($this->config->GetStorageUrl())) {
            $fileUrl = str_replace($this->urlGenerator->getAbsoluteURL("/"), $this->config->GetStorageUrl(), $fileUrl);
        }

        return $fileUrl;
    }

    /**
     * Generate array with file parameters
     *
     * @param File $file - file
     *
     * @return array
     */
    private function getFileParam($file) {
        if ($file->getSize() === 0) {
            return [null, null, null];
        }

        $key = null;
        $versionNum = 0;
        if ($file instanceof MetaFileVersionNode) {
            if ($this->versionManager->available !== true) {
                return [null, null, null];
            }

            $fileVersion = $file->getName();
            $sourceFileId = $file->getId();

            $storage = $file->getStorage();
            $path = $file->getContentDispositionFileName();

            $ownerId = $storage->getOwner($path);
            $owner = $this->userManager->get($ownerId);
            if ($owner === null) {
                return [null, null, null];
            }

            $files = $this->root->getUserFolder($ownerId)->getById($sourceFileId);
            if (empty($files)) {
                return [null, null, null];
            }
            $file = $files[0];

            $versions = array_reverse($this->versionManager->getVersionsForFile($owner, $file->getFileInfo()));

            foreach ($versions as $version) {
                $versionNum = $versionNum + 1;

                $versionId = $version->getRevisionId();
                if (strcmp($versionId, $fileVersion) === 0) {
                    $key = $this->fileUtility->getVersionKey($version);
                    $key = DocumentService::GenerateRevisionId($key);

                    break;
                }
            }
        } else {
            $owner = $file->getOwner();

            $key = $this->fileUtility->getKey($file);
            $key = DocumentService::GenerateRevisionId($key);
        }

        $fileUrl = $this->getUrl($file, $owner, $versionNum);

        $fileExtension = strtolower(pathinfo($file->getName(), PATHINFO_EXTENSION));

        return [$fileUrl, $fileExtension, $key];
    }
}