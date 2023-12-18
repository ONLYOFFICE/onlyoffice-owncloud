<?php
/**
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

use OCP\Constants;
use OCP\Files\Folder;
use OCP\Files\NotFoundException;
use OCP\IL10N;
use OCP\ILogger;
use OCP\ISession;
use OCP\Share\IManager;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Version;
use OCA\Onlyoffice\KeyManager;
use OCA\Onlyoffice\RemoteInstance;

/**
 * File utility
 *
 * @package OCA\Onlyoffice
 */
class FileUtility {
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
     * Share manager
     *
     * @var IManager
     */
    private $shareManager;

    /**
     * Session
     *
     * @var ISession
     */
    private $session;

    /**
     * Application configuration
     *
     * @var AppConfig
     */
    private $config;

    /**
     * @param string $AppName - application name
     * @param IL10N $trans - l10n service
     * @param ILogger $logger - logger
     * @param AppConfig $config - application configuration
     * @param IManager $shareManager - Share manager
     * @param IManager $ISession - Session
     */
    public function __construct(
        $AppName,
        IL10N $trans,
        ILogger $logger,
        AppConfig $config,
        IManager $shareManager,
        ISession $session
    ) {
        $this->appName = $AppName;
        $this->trans = $trans;
        $this->logger = $logger;
        $this->config = $config;
        $this->shareManager = $shareManager;
        $this->session = $session;
    }

    /**
     * Getting file by token
     *
     * @param integer $fileId - file identifier
     * @param string $shareToken - access token
     * @param string $path - file path
     *
     * @return array
     */
    public function getFileByToken($fileId, $shareToken, $path = null) {
        list($node, $error, $share) = $this->getNodeByToken($shareToken);

        if (isset($error)) {
            return [null, $error, null];
        }

        if ($node instanceof Folder) {
            if ($fileId !== null && $fileId !== 0) {
                try {
                    $files = $node->getById($fileId);
                } catch (\Exception $e) {
                    $this->logger->logException($e, ["message" => "getFileByToken: $fileId", "app" => $this->appName]);
                    return [null, $this->trans->t("Invalid request"), null];
                }

                if (empty($files)) {
                    $this->logger->info("Files not found: $fileId", ["app" => $this->appName]);
                    return [null, $this->trans->t("File not found"), null];
                }
                $file = $files[0];
            } else {
                try {
                    $file = $node->get($path);
                } catch (\Exception $e) {
                    $this->logger->logException($e, ["message" => "getFileByToken for path: $path", "app" => $this->appName]);
                    return [null, $this->trans->t("Invalid request"), null];
                }
            }
        } else {
            $file = $node;
        }

        return [$file, null, $share];
    }

    /**
     * Getting file by token
     *
     * @param string $shareToken - access token
     *
     * @return array
     */
    public function getNodeByToken($shareToken) {
        list($share, $error) = $this->getShare($shareToken);

        if (isset($error)) {
            return [null, $error, null];
        }

        if (($share->getPermissions() & Constants::PERMISSION_READ) === 0) {
            return [null, $this->trans->t("You do not have enough permissions to view the file"), null];
        }

        try {
            $node = $share->getNode();
        } catch (NotFoundException $e) {
            $this->logger->logException($e, ["message" => "getNodeByToken error", "app" => $this->appName]);
            return [null, $this->trans->t("File not found"), null];
        }

        return [$node, null, $share];
    }

    /**
     * Getting share by token
     *
     * @param string $shareToken - access token
     *
     * @return array
     */
    public function getShare($shareToken) {
        if (empty($shareToken)) {
            return [null, $this->trans->t("FileId is empty")];
        }

        $share = null;
        try {
            $share = $this->shareManager->getShareByToken($shareToken);
        } catch (ShareNotFound $e) {
            $this->logger->logException($e, ["message" => "getShare error", "app" => $this->appName]);
            $share = null;
        }

        if ($share === null || $share === false) {
            return [null, $this->trans->t("You do not have enough permissions to view the file")];
        }

        if ($share->getPassword()
            && (!$this->session->exists("public_link_authenticated")
                || $this->session->get("public_link_authenticated") !== (string) $share->getId())) {
            return [null, $this->trans->t("You do not have enough permissions to view the file")];
        }

        return [$share, null];
    }

    /**
     * Generate unique document identifier
     *
     * @param File $file - file
     * @param bool $origin - request from federated store
     *
     * @return string
     */
    public function getKey($file, $origin = false) {
        $fileId = $file->getId();

        if ($origin
            && RemoteInstance::isRemoteFile($file)) {
            $key = RemoteInstance::getRemoteKey($file);
            if (!empty($key)) {
                return $key;
            }
        }

        $key = KeyManager::get($fileId);

        if (empty($key)) {
            $instanceId = $this->config->GetSystemValue("instanceid", true);

            $key = $instanceId . "_" . $this->GUID();

            KeyManager::set($fileId, $key);
        }

        return $key;
    }

    /**
     * Detected attribute permission for shared file
     *
     * @param File $file - file
     * @param string $attribute - request from federated store
     *
     * @return bool
     */
    public function hasPermissionAttribute($file, $attribute = "download") {
        $fileStorage = $file->getStorage();
        if ($fileStorage->instanceOfStorage("\OCA\Files_Sharing\SharedStorage")) {
            $storageShare = $fileStorage->getShare();
            if (method_exists($storageShare, "getAttributes")) {
                $attributes = $storageShare->getAttributes();

                $permissionsDownload = $attributes->getAttribute("permissions", "download");
                if ($permissionsDownload !== null && $permissionsDownload !== true) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Generate unique identifier
     *
     * @return string
     */
    private function GUID() {
        if (\function_exists("com_create_guid") === true) {
            return trim(com_create_guid(), "{}");
        }

        return sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
    }

    /**
     * Generate unique file version key
     *
     * @param Version $version - file version
     *
     * @return string
     */
    public function getVersionKey($version) {
        $instanceId = $this->config->GetSystemValue("instanceid", true);

        $key = $instanceId . "_" . $version->getSourceFile()->getEtag() . "_" . $version->getRevisionId();

        return $key;
    }
}
