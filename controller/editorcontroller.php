<?php
/**
 *
 * (c) Copyright Ascensio System SIA 2020
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
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Constants;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Files\ForbiddenException;
use OCP\Files\IRootFolder;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IRequest;
use OCP\ISession;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\IUserSession;
use OCP\Share\IManager;

use OCA\Files\Helper;
use OCA\Files_Sharing\External\Storage as SharingExternalStorage;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\DocumentService;
use OCA\Onlyoffice\FileUtility;
use OCA\Onlyoffice\VersionManager;
use OCA\Onlyoffice\FileVersions;

/**
 * Controller with the main functions
 */
class EditorController extends Controller {

    /**
     * Current user session
     *
     * @var IUserSession
     */
    private $userSession;

    /**
     * Root folder
     *
     * @var IRootFolder
     */
    private $root;

    /**
     * Url generator service
     *
     * @var IURLGenerator
     */
    private $urlGenerator;

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
     * Application configuration
     *
     * @var AppConfig
     */
    private $config;

    /**
     * Hash generator
     *
     * @var Crypt
     */
    private $crypt;

    /**
     * File utility
     *
     * @var FileUtility
     */
    private $fileUtility;

    /**
     * File version manager
     *
     * @var VersionManager
    */
    private $versionManager;

    /**
     * Mobile regex from https://github.com/ONLYOFFICE/CommunityServer/blob/v9.1.1/web/studio/ASC.Web.Studio/web.appsettings.config#L35
     */
    const USER_AGENT_MOBILE = "/android|avantgo|playbook|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\\/|plucker|pocket|psp|symbian|treo|up\\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i";

    /**
     * @param string $AppName - application name
     * @param IRequest $request - request object
     * @param IRootFolder $root - root folder
     * @param IUserSession $userSession - current user session
     * @param IURLGenerator $urlGenerator - url generator service
     * @param IL10N $trans - l10n service
     * @param ILogger $logger - logger
     * @param AppConfig $config - application configuration
     * @param Crypt $crypt - hash generator
     * @param IManager $shareManager - Share manager
     * @param ISession $ISession - Session
     */
    public function __construct($AppName,
                                    IRequest $request,
                                    IRootFolder $root,
                                    IUserSession $userSession,
                                    IURLGenerator $urlGenerator,
                                    IL10N $trans,
                                    ILogger $logger,
                                    AppConfig $config,
                                    Crypt $crypt,
                                    IManager $shareManager,
                                    ISession $session
                                    ) {
        parent::__construct($AppName, $request);

        $this->userSession = $userSession;
        $this->root = $root;
        $this->urlGenerator = $urlGenerator;
        $this->trans = $trans;
        $this->logger = $logger;
        $this->config = $config;
        $this->crypt = $crypt;

        $this->versionManager = new VersionManager($AppName, $root);

        $this->fileUtility = new FileUtility($AppName, $trans, $logger, $config, $shareManager, $session);
    }

    /**
     * Create new file in folder
     *
     * @param string $name - file name
     * @param string $dir - folder path
     * @param string $shareToken - access token
     *
     * @return array
     *
     * @NoAdminRequired
     * @PublicPage
     */
    public function create($name, $dir, $shareToken = null) {
        $this->logger->debug("Create: $name", ["app" => $this->appName]);

        if (empty(shareToken) && !$this->config->isUserAllowedToUse()) {
            return ["error" => $this->trans->t("Not permitted")];
        }

        if (empty($shareToken)) {
            $userId = $this->userSession->getUser()->getUID();
            $userFolder = $this->root->getUserFolder($userId);
        } else {
            list ($userFolder, $error, $share) = $this->fileUtility->getNodeByToken($shareToken);

            if (isset($error)) {
                $this->logger->error("Create: $error", ["app" => $this->appName]);
                return ["error" => $error];
            }

            if ($userFolder instanceof File) {
                return ["error" => $this->trans->t("You don't have enough permission to create")];
            }

            if (!empty($shareToken) && ($share->getPermissions() & Constants::PERMISSION_CREATE) === 0) {
                $this->logger->error("Create in public folder without access", ["app" => $this->appName]);
                return ["error" => $this->trans->t("You do not have enough permissions to view the file")];
            }
        }

        $folder = $userFolder->get($dir);

        if ($folder === null) {
            $this->logger->error("Folder for file creation was not found: $dir", ["app" => $this->appName]);
            return ["error" => $this->trans->t("The required folder was not found")];
        }
        if (!$folder->isCreatable()) {
            $this->logger->error("Folder for file creation without permission: $dir", ["app" => $this->appName]);
            return ["error" => $this->trans->t("You don't have enough permission to create")];
        }

        $ext = strtolower("." . pathinfo($name, PATHINFO_EXTENSION));

        $lang = \OC::$server->getL10NFactory("")->get("")->getLanguageCode();

        $templatePath = $this->getTemplatePath($lang, $ext);
        if (!file_exists($templatePath)) {
            $lang = "en";
            $templatePath = $this->getTemplatePath($lang, $ext);
        }

        $template = file_get_contents($templatePath);
        if (!$template) {
            $this->logger->error("Template for file creation not found: $templatePath", ["app" => $this->appName]);
            return ["error" => $this->trans->t("Template not found")];
        }

        $name = $folder->getNonExistingName($name);

        try {
            $file = $folder->newFile($name);

            $file->putContent($template);
        } catch (NotPermittedException $e) {
            $this->logger->logException($e, ["message" => "Can't create file: $name", "app" => $this->appName]);
            return ["error" => $this->trans->t("Can't create file")];
        } catch (ForbiddenException $e) {
            $this->logger->logException($e, ["message" => "Can't put file: $name", "app" => $this->appName]);
            return ["error" => $this->trans->t("Can't create file")];
        }

        $fileInfo = $file->getFileInfo();

        $result = Helper::formatFileInfo($fileInfo);
        return $result;
    }

    /**
     * Get template path
     *
     * @param string $lang - language
     * @param string $ext - file extension
     *
     * @return string
     */
    private function getTemplatePath($lang, $ext) {
        return dirname(__DIR__) . DIRECTORY_SEPARATOR . "assets" . DIRECTORY_SEPARATOR . $lang . DIRECTORY_SEPARATOR . "new" . $ext;
    }

    /**
     * Conversion file to Office Open XML format
     *
     * @param integer $fileId - file identifier
     * @param string $shareToken - access token
     *
     * @return array
     *
     * @NoAdminRequired
     * @PublicPage
     */
    public function convert($fileId, $shareToken = null) {
        $this->logger->debug("Convert: $fileId", ["app" => $this->appName]);

        if (empty($shareToken) && !$this->config->isUserAllowedToUse()) {
            return ["error" => $this->trans->t("Not permitted")];
        }

        $user = $this->userSession->getUser();
        $userId = null;
        if (!empty($user)) {
            $userId = $user->getUID();
        }

        list ($file, $error, $share) = empty($shareToken) ? $this->getFile($userId, $fileId) : $this->fileUtility->getFileByToken($fileId, $shareToken);

        if (isset($error)) {
            $this->logger->error("Convertion: $fileId $error", ["app" => $this->appName]);
            return ["error" => $error];
        }

        if (!empty($shareToken) && ($share->getPermissions() & Constants::PERMISSION_CREATE) === 0) {
            $this->logger->error("Convertion in public folder without access: $fileId", ["app" => $this->appName]);
            return ["error" => $this->trans->t("You do not have enough permissions to view the file")];
        }

        $fileName = $file->getName();
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $format = $this->config->FormatsSetting()[$ext];
        if (!isset($format)) {
            $this->logger->info("Format for convertion not supported: $fileName", ["app" => $this->appName]);
            return ["error" => $this->trans->t("Format is not supported")];
        }

        if (!isset($format["conv"]) || $format["conv"] !== true) {
            $this->logger->info("Conversion is not required: $fileName", ["app" => $this->appName]);
            return ["error" => $this->trans->t("Conversion is not required")];
        }

        $internalExtension = "docx";
        switch ($format["type"]) {
            case "spreadsheet":
                $internalExtension = "xlsx";
                break;
            case "presentation":
                $internalExtension = "pptx";
                break;
        }

        $newFileUri = null;
        $documentService = new DocumentService($this->trans, $this->config);
        $key = $this->fileUtility->getKey($file);
        $fileUrl = $this->getUrl($file, $user, $shareToken);
        try {
            $newFileUri = $documentService->GetConvertedUri($fileUrl, $ext, $internalExtension, $key);
        } catch (\Exception $e) {
            $this->logger->logException($e, ["message" => "GetConvertedUri: " . $file->getId(), "app" => $this->appName]);
            return ["error" => $e->getMessage()];
        }

        $folder = $file->getParent();
        if (!$folder->isCreatable()) {
            $folder = $this->root->getUserFolder($userId);
        }

        try {
            $newData = $documentService->Request($newFileUri);
        } catch (\Exception $e) {
            $this->logger->logException($e, ["message" => "Failed to download converted file", "app" => $this->appName]);
            return ["error" => $this->trans->t("Failed to download converted file")];
        }

        $fileNameWithoutExt = substr($fileName, 0, strlen($fileName) - strlen($ext) - 1);
        $newFileName = $folder->getNonExistingName($fileNameWithoutExt . "." . $internalExtension);

        try {
            $file = $folder->newFile($newFileName);

            $file->putContent($newData);
        } catch (NotPermittedException $e) {
            $this->logger->logException($e, ["message" => "Can't create file: $newFileName", "app" => $this->appName]);
            return ["error" => $this->trans->t("Can't create file")];
        } catch (ForbiddenException $e) {
            $this->logger->logException($e, ["message" => "Can't put file: $newFileName", "app" => $this->appName]);
            return ["error" => $this->trans->t("Can't create file")];
        }

        $fileInfo = $file->getFileInfo();

        $result = Helper::formatFileInfo($fileInfo);
        return $result;
    }

    /**
     * Save file to folder
     *
     * @param string $name - file name
     * @param string $dir - folder path
     * @param string $url - file url
     *
     * @return array
     *
     * @NoAdminRequired
     * @PublicPage
     */
    public function save($name, $dir, $url) {
        $this->logger->debug("Save: $name", ["app" => $this->appName]);

        if (!$this->config->isUserAllowedToUse()) {
            return ["error" => $this->trans->t("Not permitted")];
        }

        $userId = $this->userSession->getUser()->getUID();
        $userFolder = $this->root->getUserFolder($userId);

        $folder = $userFolder->get($dir);

        if ($folder === null) {
            $this->logger->error("Folder for saving file was not found: $dir", ["app" => $this->appName]);
            return ["error" => $this->trans->t("The required folder was not found")];
        }
        if (!$folder->isCreatable()) {
            $this->logger->error("Folder for saving file without permission: $dir", ["app" => $this->appName]);
            return ["error" => $this->trans->t("You don't have enough permission to create")];
        }

        $url = $this->config->ReplaceDocumentServerUrlToInternal($url);

        try {
            $documentService = new DocumentService($this->trans, $this->config);
            $newData = $documentService->Request($url);
        } catch (\Exception $e) {
            $this->logger->logException($e, ["message" => "Failed to download file for saving", "app" => $this->appName]);
            return ["error" => $this->trans->t("Download failed")];
        }

        $name = $folder->getNonExistingName($name);

        try {
            $file = $folder->newFile($name);

            $file->putContent($newData);
        } catch (NotPermittedException $e) {
            $this->logger->logException($e, ["message" => "Can't save file: $name", "app" => $this->appName]);
            return ["error" => $this->trans->t("Can't create file")];
        } catch (ForbiddenException $e) {
            $this->logger->logException($e, ["message" => "Can't put file: $name", "app" => $this->appName]);
            return ["error" => $this->trans->t("Can't create file")];
        }

        $fileInfo = $file->getFileInfo();

        $result = Helper::formatFileInfo($fileInfo);
        return $result;
    }

    /**
     * Get versions history for file
     *
     * @param integer $fileId - file identifier
     * @param string $shareToken - access token
     *
     * @return array
     *
     * @NoAdminRequired
     * @PublicPage
     */
    public function history($fileId, $shareToken = null) {
        $this->logger->debug("Request history for: $fileId", ["app" => $this->appName]);

        $history = [];

        $user = $this->userSession->getUser();
        $userId = null;
        if (!empty($user)) {
            $userId = $user->getUID();
        }

        list ($file, $error, $share) = empty($shareToken) ? $this->getFile($userId, $fileId) : $this->fileUtility->getFileByToken($fileId, $shareToken);

        if (isset($error)) {
            $this->logger->error("History: $fileId $error", ["app" => $this->appName]);
            return ["error" => $error];
        }

        if ($fileId === 0) {
            $fileId = $file->getId();
        }

        $ownerId = null;
        $owner = $file->getFileInfo()->getOwner();
        if ($owner !== null) {
            $ownerId = $owner->getUID();
        }

        $versions = array();
        if ($this->versionManager->available
            && $owner !== null) {
            $versions = array_reverse($this->versionManager->getVersionsForFile($owner, $file->getFileInfo()));
        }

        $prevVersion = "";
        $versionNum = 0;
        foreach ($versions as $version) {
            $versionNum = $versionNum + 1;

            $key = $this->fileUtility->getVersionKey($version);
            $key = DocumentService::GenerateRevisionId($key);

            $historyItem = [
                "created" => $version->getTimestamp(),
                "key" => $key,
                "user" => [
                    "id" => $this->buildUserId($ownerId),
                    "name" => $owner->getDisplayName()
                ],
                "version" => $versionNum
            ];

            $versionId = $version->getRevisionId();
            $historyData = FileVersions::getHistoryData($ownerId, $fileId, $versionId, $prevVersion);
            if ($historyData !== null) {
                $historyItem["changes"] = $historyData["changes"];
                $historyItem["serverVersion"] = $historyData["serverVersion"];
            }

            $prevVersion = $versionId;

            array_push($history, $historyItem);
        }

        $key = $this->fileUtility->getKey($file, true);
        $key = DocumentService::GenerateRevisionId($key);

        $historyItem = [
            "created" => $file->getMTime(),
            "key" => $key,
            "version" => $versionNum + 1
        ];

        if ($owner !== null) {
            $historyItem["user"] = [
                "id" => $this->buildUserId($owner->getUID()),
                "name" => $owner->getDisplayName()
            ];
        }

        $versionId = $file->getFileInfo()->getMtime();
        $historyData = FileVersions::getHistoryData($ownerId, $fileId, $versionId, $prevVersion);
        if ($historyData !== null) {
            $historyItem["changes"] = $historyData["changes"];
            $historyItem["serverVersion"] = $historyData["serverVersion"];
        }

        array_push($history, $historyItem);

        return $history;
    }

    /**
     * Get file attributes of specific version
     *
     * @param integer $fileId - file identifier
     * @param integer $version - file version
     * @param string $shareToken - access token
     *
     * @return array
     *
     * @NoAdminRequired
     * @PublicPage
     */
    public function version($fileId, $version, $shareToken = null) {
        $this->logger->debug("Request version for: $fileId ($version)", ["app" => $this->appName]);

        $version = empty($version) ? null : $version;

        $user = $this->userSession->getUser();
        $userId = null;
        if (!empty($user)) {
            $userId = $user->getUID();
        }

        list ($file, $error, $share) = empty($shareToken) ? $this->getFile($userId, $fileId) : $this->fileUtility->getFileByToken($fileId, $shareToken);

        if (isset($error)) {
            $this->logger->error("History: $fileId $error", ["app" => $this->appName]);
            return ["error" => $error];
        }

        if ($fileId === 0) {
            $fileId = $file->getId();
        }

        $owner = null;
        $ownerId = null;
        $versions = array();
        if ($this->versionManager->available) {
            $owner = $file->getFileInfo()->getOwner();
            if ($owner !== null) {
                $ownerId = $owner->getUID();
                $versions = array_reverse($this->versionManager->getVersionsForFile($owner, $file->getFileInfo()));
            }
        }

        $key = null;
        $fileUrl = null;
        $versionId = null;
        if ($version > count($versions)) {
            $key = $this->fileUtility->getKey($file, true);
            $versionId = $file->getFileInfo()->getMtime();

            $fileUrl = $this->getUrl($file, $user, $shareToken);
        } else {
            $fileVersion = array_values($versions)[$version - 1];

            $key = $this->fileUtility->getVersionKey($fileVersion);
            $versionId = $fileVersion->getRevisionId();

            $fileUrl = $this->getUrl($file, $user, $shareToken, $version);
        }
        $key = DocumentService::GenerateRevisionId($key);

        $result = [
            "url" => $fileUrl,
            "version" => $version,
            "key" => $key
        ];

        if ($version > 1
            && count($versions) >= $version - 1
            && FileVersions::hasChanges($ownerId, $fileId, $versionId)) {

            $changesUrl = $this->getUrl($file, $user, $shareToken, $version, true);
            $result["changesUrl"] = $changesUrl;

            $prevVersion = array_values($versions)[$version - 2];
            $prevVersionKey = $this->fileUtility->getVersionKey($prevVersion);
            $prevVersionKey = DocumentService::GenerateRevisionId($prevVersionKey);

            $prevVersionUrl = $this->getUrl($file, $user, $shareToken, $version - 1);

            $result["previous"] = [
                "key" => $prevVersionKey,
                "url" => $prevVersionUrl
            ];
        }

        if (!empty($this->config->GetDocumentServerSecret())) {
            $token = \Firebase\JWT\JWT::encode($result, $this->config->GetDocumentServerSecret());
            $result["token"] = $token;
        }

        return $result;
    }

    /**
     * Get presigned url to file
     *
     * @param string $filePath - file path
     *
     * @return array
     *
     * @NoAdminRequired
     */
    public function url($filePath) {
        $this->logger->debug("Request url for: $filePath", ["app" => $this->appName]);

        if (!$this->config->isUserAllowedToUse()) {
            return ["error" => $this->trans->t("Not permitted")];
        }

        $user = $this->userSession->getUser();
        $userId = $user->getUID();
        $userFolder = $this->root->getUserFolder($userId);

        $file = $userFolder->get($filePath);

        if ($file === null) {
            $this->logger->error("File for generate presigned url was not found: $dir", ["app" => $this->appName]);
            return ["error" => $this->trans->t("File not found")];
        }
        if (!$file->isReadable()) {
            $this->logger->error("Folder for saving file without permission: $dir", ["app" => $this->appName]);
            return ["error" => $this->trans->t("You do not have enough permissions to view the file")];
        }

        $fileName = $file->getName();
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $fileUrl = $this->getUrl($file, $user);

        $result = [
            "fileType" => $ext,
            "url" => $fileUrl
        ];

        if (!empty($this->config->GetDocumentServerSecret())) {
            $token = \Firebase\JWT\JWT::encode($result, $this->config->GetDocumentServerSecret());
            $result["token"] = $token;
        }

        return $result;
    }

    /**
     * Print editor section
     *
     * @param integer $fileId - file identifier
     * @param string $filePath - file path
     * @param string $shareToken - access token
     * @param integer $version - file version
     * @param bool $inframe - open in frame
     *
     * @return TemplateResponse|RedirectResponse
     *
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index($fileId, $filePath = null, $shareToken = null, $version = 0, $inframe = false) {
        $this->logger->debug("Open: $fileId ($version) $filePath", ["app" => $this->appName]);

        if (empty($shareToken) && !$this->userSession->isLoggedIn()) {
            $redirectUrl = $this->urlGenerator->linkToRoute("core.login.showLoginForm", [
                "redirect_url" => $this->request->getRequestUri()
            ]);
            return new RedirectResponse($redirectUrl);
        }

        if (empty($shareToken) && !$this->config->isUserAllowedToUse()) {
            return $this->renderError($this->trans->t("Not permitted"));
        }

        $documentServerUrl = $this->config->GetDocumentServerUrl();

        if (empty($documentServerUrl)) {
            $this->logger->error("documentServerUrl is empty", ["app" => $this->appName]);
            return $this->renderError($this->trans->t("ONLYOFFICE app is not configured. Please contact admin"));
        }

        $params = [
            "documentServerUrl" => $documentServerUrl,
            "fileId" => $fileId,
            "filePath" => $filePath,
            "shareToken" => $shareToken,
            "version" => $version,
            "inframe" => false
        ];

        if ($inframe === true) {
            $params["inframe"] = true;
            $response = new TemplateResponse($this->appName, "editor", $params, "plain");
        } else {
            $response = new TemplateResponse($this->appName, "editor", $params);
        }

        $csp = new ContentSecurityPolicy();
        $csp->allowInlineScript(true);

        if (preg_match("/^https?:\/\//i", $documentServerUrl)) {
            $csp->addAllowedScriptDomain($documentServerUrl);
            $csp->addAllowedFrameDomain($documentServerUrl);
        } else {
            $csp->addAllowedFrameDomain("'self'");
        }
        $response->setContentSecurityPolicy($csp);

        return $response;
    }

    /**
     * Print public editor section
     *
     * @param integer $fileId - file identifier
     * @param string $shareToken - access token
     * @param integer $version - file version
     * @param bool $inframe - open in frame
     *
     * @return TemplateResponse
     *
     * @NoAdminRequired
     * @NoCSRFRequired
     * @PublicPage
     */
    public function PublicPage($fileId, $shareToken, $version = 0, $inframe = false) {
        return $this->index($fileId, null, $shareToken, $version, $inframe);
    }

    /**
     * Get template loader Onlyoffice
     *
     * @return TemplateResponse
     *
     * @NoAdminRequired
     * @NoCSRFRequired
     * @PublicPage
     */
    public function loader() {
        return new TemplateResponse($this->appName, "loader", [], "plain");
    }

    /**
     * Collecting the file parameters for the document service
     *
     * @param integer $fileId - file identifier
     * @param string $filePath - file path
     * @param string $shareToken - access token
     * @param integer $version - file version
     * @param integer $inframe - open in frame. 0 - no, 1 - yes, 2 - without goback for old editor (5.4)
     * @param bool $desktop - desktop label
     *
     * @return array
     *
     * @NoAdminRequired
     * @PublicPage
     */
    public function config($fileId, $filePath = null, $shareToken = null, $version = 0, $inframe = 0, $desktop = false) {

        if (empty($shareToken) && !$this->config->isUserAllowedToUse()) {
            return ["error" => $this->trans->t("Not permitted")];
        }

        $user = $this->userSession->getUser();
        $userId = null;
        if (!empty($user)) {
            $userId = $user->getUID();
        }

        list ($file, $error, $share) = empty($shareToken) ? $this->getFile($userId, $fileId, $filePath) : $this->fileUtility->getFileByToken($fileId, $shareToken);

        if (isset($error)) {
            $this->logger->error("Config: $fileId $error", ["app" => $this->appName]);
            return ["error" => $error];
        }

        $fileName = $file->getName();
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $format = $this->config->FormatsSetting()[$ext];
        if (!isset($format)) {
            $this->logger->info("Format is not supported for editing: $fileName", ["app" => $this->appName]);
            return ["error" => $this->trans->t("Format is not supported")];
        }

        $fileUrl = $this->getUrl($file, $user, $shareToken, $version);

        $key = null;
        if ($version > 0
            && $this->versionManager->available) {
            $owner = $file->getFileInfo()->getOwner();
            if ($owner !== null) {
                $versions = array_reverse($this->versionManager->getVersionsForFile($owner, $file->getFileInfo()));

                if ($version <= count($versions)) {
                    $fileVersion = array_values($versions)[$version - 1];

                    $key = $this->fileUtility->getVersionKey($fileVersion);
                }
            }
        }
        if ($key === null) {
            $key = $this->fileUtility->getKey($file, true);
        }
        $key = DocumentService::GenerateRevisionId($key);

        $params = [
            "document" => [
                "fileType" => $ext,
                "key" => $key,
                "permissions" => [],
                "title" => $fileName,
                "url" => $fileUrl,
            ],
            "documentType" => $format["type"],
            "editorConfig" => [
                "lang" => str_replace("_", "-", \OC::$server->getL10NFactory("")->get("")->getLanguageCode())
            ]
        ];

        $restrictedEditing = false;
        $fileStorage = $file->getStorage();
        if (empty($shareToken) && $fileStorage->instanceOfStorage("\OCA\Files_Sharing\SharedStorage")) {
            $storageShare = $fileStorage->getShare();
            if (method_exists($storageShare, "getAttributes"))
            {
                $attributes = $storageShare->getAttributes();

                $permissionsDownload = $attributes->getAttribute("permissions", "download");
                if ($permissionsDownload !== null) {
                    $params["document"]["permissions"]["download"] = $params["document"]["permissions"]["print"] = $permissionsDownload === true;
                }

                if (isset($format["review"]) && $format["review"]) {
                    $permissionsReviewOnly = $attributes->getAttribute($this->appName, "review");
                    if ($permissionsReviewOnly !== null && $permissionsReviewOnly === true) {
                        $restrictedEditing = true;
                        $params["document"]["permissions"]["review"] = true;
                    }
                }

                if (isset($format["fillForms"]) && $format["fillForms"]) {
                    $permissionsFillFormsOnly = $attributes->getAttribute($this->appName, "fillForms");
                    if ($permissionsFillFormsOnly !== null && $permissionsFillFormsOnly === true) {
                        $restrictedEditing = true;
                        $params["document"]["permissions"]["fillForms"] = true;
                    }
                }

                if (isset($format["comment"]) && $format["comment"]) {
                    $permissionsCommentOnly = $attributes->getAttribute($this->appName, "comment");
                    if ($permissionsCommentOnly !== null && $permissionsCommentOnly === true) {
                        $restrictedEditing = true;
                        $params["document"]["permissions"]["comment"] = true;
                    }
                }

                if (isset($format["modifyFilter"]) && $format["modifyFilter"]) {
                    $permissionsModifyFilter = $attributes->getAttribute($this->appName, "modifyFilter");
                    if ($permissionsModifyFilter !== null) {
                        $params["document"]["permissions"]["modifyFilter"] = $permissionsModifyFilter === true;
                    }
                }
            }
        }

        $canEdit = isset($format["edit"]) && $format["edit"];
        $editable = $version < 1
                    && $file->isUpdateable()
                    && (empty($shareToken) || ($share->getPermissions() & Constants::PERMISSION_UPDATE) === Constants::PERMISSION_UPDATE);
        $params["document"]["permissions"]["edit"] = $editable;
        if (($editable || $restrictedEditing) && $canEdit) {
            $ownerId = null;
            $owner = $file->getOwner();
            if (!empty($owner)) {
                $ownerId = $owner->getUID();
            }

            $hashCallback = $this->crypt->GetHash(["userId" => $userId, "ownerId" => $ownerId, "fileId" => $file->getId(), "filePath" => $filePath, "shareToken" => $shareToken, "action" => "track"]);
            $callback = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".callback.track", ["doc" => $hashCallback]);

            if (!empty($this->config->GetStorageUrl())) {
                $callback = str_replace($this->urlGenerator->getAbsoluteURL("/"), $this->config->GetStorageUrl(), $callback);
            }

            $params["editorConfig"]["callbackUrl"] = $callback;
        } else {
            $params["editorConfig"]["mode"] = "view";
        }

        if (\OC::$server->getRequest()->isUserAgent([$this::USER_AGENT_MOBILE])) {
            $params["type"] = "mobile";
        }

        if (!empty($userId)) {
            $params["editorConfig"]["user"] = [
                "id" => $this->buildUserId($userId),
                "name" => $user->getDisplayName()
            ];
        }

        $folderLink = null;

        if (!empty($shareToken)) {
            $node = $share->getNode();
            if ($node instanceof Folder) {
                $sharedFolder = $node;
                $folderPath = $sharedFolder->getRelativePath($file->getParent()->getPath());
                if (!empty($folderPath)) {
                    $linkAttr = [
                        "path" => $folderPath,
                        "scrollto" => $file->getName(),
                        "token" => $shareToken
                    ];
                    $folderLink = $this->urlGenerator->linkToRouteAbsolute("files_sharing.sharecontroller.showShare", $linkAttr);
                }
            }
        } else if (!empty($userId)) {
            $userFolder = $this->root->getUserFolder($userId);
            $folderPath = $userFolder->getRelativePath($file->getParent()->getPath());
            if (!empty($folderPath)) {
                $linkAttr = [
                    "dir" => $folderPath,
                    "scrollto" => $file->getName()
                ];
                $folderLink = $this->urlGenerator->linkToRouteAbsolute("files.view.index", $linkAttr);
            }
        }

        if ($folderLink !== null && $inframe !== 2) {
            $params["editorConfig"]["customization"]["goback"] = [
                "url"  => $folderLink
            ];

            if (!$desktop) {
                if ($this->config->GetSameTab()) {
                    $params["editorConfig"]["customization"]["goback"]["blank"] = false;
                    if ($inframe === 1) {
                        $params["editorConfig"]["customization"]["goback"]["requestClose"] = true;
                    }
                }
            }
        }

        if ($inframe === 1) {
            $params["_files_sharing"] = \OC::$server->getAppManager()->isEnabledForUser("files_sharing");
        }

        $params = $this->setCustomization($params);

        if ($file->getStorage()->instanceOfStorage(SharingExternalStorage::class)) {
            //otherwise forcesave will delete the key
            $params["editorConfig"]["customization"]["forcesave"] = false;
        }

        if ($this->config->UseDemo()) {
            $params["editorConfig"]["tenant"] = $this->config->GetSystemValue("instanceid", true);
        }

        if (!empty($this->config->GetDocumentServerSecret())) {
            $token = \Firebase\JWT\JWT::encode($params, $this->config->GetDocumentServerSecret());
            $params["token"] = $token;
        }

        $this->logger->debug("Config is generated for: $fileId ($version) with key $key", ["app" => $this->appName]);

        return $params;
    }

    /**
     * Getting file by identifier
     *
     * @param string $userId - user identifier
     * @param integer $fileId - file identifier
     * @param string $filePath - file path
     *
     * @return array
     */
    private function getFile($userId, $fileId, $filePath = null) {
        if (empty($fileId)) {
            return [null, $this->trans->t("FileId is empty"), null];
        }

        try {
            $files = $this->root->getUserFolder($userId)->getById($fileId);
        } catch (\Exception $e) {
            $this->logger->logException($e, ["message" => "getFile: $fileId", "app" => $this->appName]);
            return [null, $this->trans->t("Invalid request"), null];
        }

        if (empty($files)) {
            $this->logger->info("Files not found: $fileId", ["app" => $this->appName]);
            return [null, $this->trans->t("File not found"), null];
        }

        $file = $files[0];

        if (count($files) > 1 && !empty($filePath)) {
            $filePath = "/" . $userId . "/files" . $filePath;
            foreach ($files as $curFile) {
                if ($curFile->getPath() === $filePath) {
                    $file = $curFile;
                    break;
                }
            }
        }

        if (!$file->isReadable()) {
            return [null, $this->trans->t("You do not have enough permissions to view the file"), null];
        }

        return [$file, null, null];
    }

    /**
     * Generate secure link to download document
     *
     * @param File $file - file
     * @param IUser $user - user with access
     * @param string $shareToken - access token
     * @param integer $version - file version
     * @param bool $changes - is required url to file changes
     *
     * @return string
     */
    private function getUrl($file, $user = null, $shareToken = null, $version = 0, $changes = false) {

        $data = [
            "action" => "download",
            "fileId" => $file->getId()
        ];

        $userId = null;
        if (!empty($user)) {
            $userId = $user->getUID();
            $data["userId"] = $userId;
        }
        if (!empty($shareToken)) {
            $data["shareToken"] = $shareToken;
        }
        if ($version > 0) {
            $data["version"] = $version;
        }
        if ($changes) {
            $data["changes"] = true;
        }

        $hashUrl = $this->crypt->GetHash($data);

        $fileUrl = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".callback.download", ["doc" => $hashUrl]);

        if (!empty($this->config->GetStorageUrl())
            && !$changes) {
            $fileUrl = str_replace($this->urlGenerator->getAbsoluteURL("/"), $this->config->GetStorageUrl(), $fileUrl);
        }

        return $fileUrl;
    }

    /**
     * Generate unique user identifier
     *
     * @param string $userId - current user identifier
     *
     * @return string
     */
    private function buildUserId($userId) {
        $instanceId = $this->config->GetSystemValue("instanceid", true);
        $userId = $instanceId . "_" . $userId;
        return $userId;
    }

    /**
     * Set customization parameters
     *
     * @param array params - file parameters
     *
     * @return array
     */
    private function setCustomization($params) {
        //default is true
        if ($this->config->GetCustomizationChat() === false) {
            $params["editorConfig"]["customization"]["chat"] = false;
        }

        //default is false
        if ($this->config->GetCustomizationCompactHeader() === true) {
            $params["editorConfig"]["customization"]["compactHeader"] = true;
        }

        //default is false
        if ($this->config->GetCustomizationFeedback() === true) {
            $params["editorConfig"]["customization"]["feedback"] = true;
        }

        //default is false
        if ($this->config->GetCustomizationForcesave() === true) {
            $params["editorConfig"]["customization"]["forcesave"] = true;
        }

        //default is true
        if ($this->config->GetCustomizationHelp() === false) {
            $params["editorConfig"]["customization"]["help"] = false;
        }

        //default is original
        $reviewDisplay = $this->config->GetCustomizationReviewDisplay();
        if ($reviewDisplay !== "original") {
            $params["editorConfig"]["customization"]["reviewDisplay"] = $reviewDisplay;
        }

        //default is false
        if ($this->config->GetCustomizationToolbarNoTabs() === true) {
            $params["editorConfig"]["customization"]["toolbarNoTabs"] = true;
        }


        /* from system config */

        $autosave = $this->config->GetSystemValue($this->config->_customization_autosave);
        if (isset($autosave)) {
            $params["editorConfig"]["customization"]["autosave"] = $autosave;
        }

        $customer = $this->config->GetSystemValue($this->config->_customization_customer);
        if (isset($customer)) {
            $params["editorConfig"]["customization"]["customer"] = $customer;
        }

        $loaderLogo = $this->config->GetSystemValue($this->config->_customization_loaderLogo);
        if (isset($loaderLogo)) {
            $params["editorConfig"]["customization"]["loaderLogo"] = $loaderLogo;
        }

        $loaderName = $this->config->GetSystemValue($this->config->_customization_loaderName);
        if (isset($loaderName)) {
            $params["editorConfig"]["customization"]["loaderName"] = $loaderName;
        }

        $logo = $this->config->GetSystemValue($this->config->_customization_logo);
        if (isset($logo)) {
            $params["editorConfig"]["customization"]["logo"] = $logo;
        }

        $zoom = $this->config->GetSystemValue($this->config->_customization_zoom);
        if (isset($zoom)) {
            $params["editorConfig"]["customization"]["zoom"] = $zoom;
        }

        return $params;
    }

    /**
     * Print error page
     *
     * @param string $error - error message
     * @param string $hint - error hint
     *
     * @return TemplateResponse
     */
    private function renderError($error, $hint = "") {
        return new TemplateResponse("", "error", [
                "errors" => [
                    [
                        "error" => $error,
                        "hint" => $hint
                    ]
                ]
            ], "error");
    }
}
