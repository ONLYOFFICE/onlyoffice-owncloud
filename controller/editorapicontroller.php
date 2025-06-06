<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
 * (c) Copyright Ascensio System SIA 2025
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

use OCP\AppFramework\OCSController;
use OCP\AppFramework\Http\JSONResponse;
use OCP\Constants;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Files\IRootFolder;
use OCP\Files\Storage\IPersistentLockingStorage;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IRequest;
use OCP\ISession;
use OCP\ITagManager;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\IUserSession;
use OCP\Share\IManager;

use OC\Tags;

use OCA\Onlyoffice\AppConfig;
use OCA\Onlyoffice\Crypt;
use OCA\Onlyoffice\DocumentService;
use OCA\Onlyoffice\FileUtility;
use OCA\Onlyoffice\VersionManager;
use OCA\Onlyoffice\TemplateManager;

/**
 * Controller with the main functions
 */
class EditorApiController extends OCSController {
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
	 * Tag manager
	 *
	 * @var ITagManager
	 */
	private $tagManager;

	/**
	 * Mobile regex from https://github.com/ONLYOFFICE/CommunityServer/blob/v9.1.1/web/studio/ASC.Web.Studio/web.appsettings.config#L35
	 */
	public const USER_AGENT_MOBILE = "/android|avantgo|playbook|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\\/|plucker|pocket|psp|symbian|treo|up\\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i";

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
	 * @param ISession $session - Session
	 * @param ITagManager $tagManager - Tag manager
	 */
	public function __construct(
		$AppName,
		IRequest $request,
		IRootFolder $root,
		IUserSession $userSession,
		IURLGenerator $urlGenerator,
		IL10N $trans,
		ILogger $logger,
		AppConfig $config,
		Crypt $crypt,
		IManager $shareManager,
		ISession $session,
		ITagManager $tagManager
	) {
		parent::__construct($AppName, $request);

		$this->userSession = $userSession;
		$this->root = $root;
		$this->urlGenerator = $urlGenerator;
		$this->trans = $trans;
		$this->logger = $logger;
		$this->config = $config;
		$this->crypt = $crypt;
		$this->tagManager = $tagManager;

		$this->versionManager = new VersionManager($AppName, $root);

		$this->fileUtility = new FileUtility($AppName, $trans, $logger, $config, $shareManager, $session);
	}

	/**
	 * Filling empty file an template
	 *
	 * @param int $fileId - file identificator
	 *
	 * @return JSONResponse
	 *
	 * @NoAdminRequired
	 * @PublicPage
	 */
	public function fillempty($fileId) {
		$this->logger->debug("Fill empty: $fileId", ["app" => $this->appName]);

		if (empty($fileId)) {
			$this->logger->error("File for filling was not found: $fileId", ["app" => $this->appName]);
			return new JSONResponse(["error" => $this->trans->t("FileId is empty")]);
		}

		$userId = $this->userSession->getUser()->getUID();

		list($file, $error, $share) = $this->getFile($userId, $fileId);
		if (isset($error)) {
			$this->logger->error("Fill empty: $fileId $error", ["app" => $this->appName]);
			return new JSONResponse(["error" => $error]);
		}

		if ($file->getSize() > 0) {
			$this->logger->error("File is't empty: $fileId", ["app" => $this->appName]);
			return new JSONResponse(["error" => $this->trans->t("Not permitted")]);
		}

		if (!$file->isUpdateable()) {
			$this->logger->error("File without permission: $fileId", ["app" => $this->appName]);
			return new JSONResponse(["error" => $this->trans->t("Not permitted")]);
		}

		$name = $file->getName();
		$template = TemplateManager::getEmptyTemplate($name);

		if (!$template) {
			$this->logger->error("Template for file filling not found: $name ($fileId)", ["app" => $this->appName]);
			return new JSONResponse(["error" => $this->trans->t("Template not found")]);
		}

		try {
			$file->putContent($template);
		} catch (NotPermittedException $e) {
			$this->logger->logException($e, ["message" => "Can't put file: $name", "app" => $this->appName]);
			return new JSONResponse(["error" => $this->trans->t("Can't create file")]);
		}

		return new JSONResponse([]);
	}

	/**
	 * Collecting the file parameters for the document service
	 *
	 * @param integer $fileId - file identifier
	 * @param string $filePath - file path
	 * @param string $shareToken - access token
	 * @param integer $version - file version
	 * @param bool $inframe - open in frame
	 * @param bool $desktop - desktop label
	 * @param bool $template - file is template
	 * @param string $anchor - anchor link
	 *
	 * @return JSONResponse
	 *
	 * @NoAdminRequired
	 * @PublicPage
	 * @CORS
	 */
	public function config($fileId, $filePath = null, $shareToken = null, $version = 0, $inframe = false, $desktop = false, $template = false, $anchor = null) {
		$user = $this->userSession->getUser();
		$userId = null;
		$accountId = null;
		if (!empty($user)) {
			$userId = $user->getUID();
			$accountId = $user->getAccountId();
		}

		list($file, $error, $share) = empty($shareToken) ? $this->getFile($userId, $fileId, $filePath, $template) : $this->fileUtility->getFileByToken($fileId, $shareToken);

		if (isset($error)) {
			$this->logger->error("Config: $fileId $error", ["app" => $this->appName]);
			return new JSONResponse(["error" => $error]);
		}

		$checkUserAllowGroups = $userId;
		if (!empty($share)) {
			$checkUserAllowGroups = $share->getSharedBy();
		}
		if (!$this->config->isUserAllowedToUse($checkUserAllowGroups)) {
			return new JSONResponse(["error" => $this->trans->t("Not permitted")]);
		}

		$fileName = $file->getName();
		$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
		$format = !empty($ext) && \array_key_exists($ext, $this->config->formatsSetting()) ? $this->config->formatsSetting()[$ext] : null;
		if (!isset($format)) {
			$this->logger->info("Format is not supported for editing: $fileName", ["app" => $this->appName]);
			return new JSONResponse(["error" => $this->trans->t("Format is not supported")]);
		}

		$fileUrl = $this->getUrl($file, $user, $shareToken, $version, null, $template);

		$key = null;
		if ($version > 0
			&& $this->versionManager->available
		) {
			$owner = $file->getFileInfo()->getOwner();
			if ($owner !== null) {
				$versions = array_reverse($this->versionManager->getVersionsForFile($owner, $file->getFileInfo()));

				if ($version <= \count($versions)) {
					$fileVersion = array_values($versions)[$version - 1];

					$key = $this->fileUtility->getVersionKey($fileVersion);
				}
			}
		}
		if ($key === null) {
			$key = $this->fileUtility->getKey($file, true);
		}
		$key = DocumentService::generateRevisionId($key);

		$params = [
			"document" => [
				"fileType" => $ext,
				"key" => $key,
				"permissions" => [],
				"title" => $fileName,
				"url" => $fileUrl,
				"referenceData" => [
					"fileKey" => (string)$file->getId(),
					"instanceId" => $this->config->getSystemValue("instanceid", true),
				],
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
			if (method_exists($storageShare, "getAttributes")) {
				$attributes = $storageShare->getAttributes();
				$canDownload = FileUtility::canShareDownload($storageShare);
				$params["document"]["permissions"]["download"] = $params["document"]["permissions"]["print"] = $params["document"]["permissions"]["copy"] = $canDownload === true;

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

		$isPersistentLock = false;
		if ($version < 1
			&& (\OC::$server->getConfig()->getAppValue("files", "enable_lock_file_action", "no") === "yes")
			&& $fileStorage->instanceOfStorage(IPersistentLockingStorage::class)
		) {
			$locks = $fileStorage->getLocks($file->getFileInfo()->getInternalPath(), false);
			if (\count($locks) > 0) {
				$activeLock = $locks[0];

				if ($accountId !== $activeLock->getOwnerAccountId()) {
					$isPersistentLock = true;
					$lockOwner = $activeLock->getOwner();
					$this->logger->debug("File $fileId is locked by $lockOwner", ["app" => $this->appName]);
				}
			}
		}

		$canEdit = isset($format["edit"]) && $format["edit"];
		$canFillForms = isset($format["fillForms"]) && $format["fillForms"];
		$editable = $version < 1
					&& !$template
					&& $file->isUpdateable()
					&& (empty($shareToken) || ($share->getPermissions() & Constants::PERMISSION_UPDATE) === Constants::PERMISSION_UPDATE);
		$params["document"]["permissions"]["edit"] = $editable && !$isPersistentLock;
		if (($editable || $restrictedEditing) && ($canEdit || $canFillForms) && !$isPersistentLock) {
			$ownerId = null;
			$owner = $file->getOwner();
			if (!empty($owner)) {
				$ownerId = $owner->getUID();
			}

			$canProtect = true;
			if ($this->config->getProtection() === "owner") {
				$canProtect = $ownerId === $userId;
			}
			$params["document"]["permissions"]["protect"] = $canProtect;

			if (isset($shareToken)) {
				$params["document"]["permissions"]["chat"] = false;
				$params["document"]["permissions"]["protect"] = false;
			}

			if ($canFillForms) {
				$params["document"]["permissions"]["fillForms"] = true;
				$params["canEdit"] = $canEdit && $editable;
			}

			$hashCallback = $this->crypt->getHash(["userId" => $userId, "ownerId" => $ownerId, "fileId" => $file->getId(), "filePath" => $filePath, "shareToken" => $shareToken, "action" => "track"]);
			$callback = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".callback.track", ["doc" => $hashCallback]);

			if (!$this->config->useDemo() && !empty($this->config->getStorageUrl())) {
				$callback = str_replace($this->urlGenerator->getAbsoluteURL("/"), $this->config->getStorageUrl(), $callback);
			}

			$params["editorConfig"]["callbackUrl"] = $callback;
		} else {
			$params["editorConfig"]["mode"] = "view";

			if (isset($shareToken) && empty($userId)) {
				$params["editorConfig"]["coEditing"] = [
					"mode" => "strict",
					"change" => false
				];
			}
		}

		if (\OC::$server->getRequest()->isUserAgent([$this::USER_AGENT_MOBILE])) {
			$params["type"] = "mobile";
		}

		if (!$template
			&& $file->isUpdateable()
			&& !$isPersistentLock
			&& (empty($shareToken) || ($share->getPermissions() & Constants::PERMISSION_UPDATE) === Constants::PERMISSION_UPDATE)
		) {
			$params["document"]["permissions"]["changeHistory"] = true;
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
		} elseif (!empty($userId)) {
			$userFolder = $this->root->getUserFolder($userId);
			$folderPath = $userFolder->getRelativePath($file->getParent()->getPath());
			if (!empty($folderPath)) {
				$linkAttr = [
					"dir" => $folderPath,
					"scrollto" => $file->getName()
				];
				$folderLink = $this->urlGenerator->linkToRouteAbsolute("files.view.index", $linkAttr);
			}

			switch ($params["documentType"]) {
				case "word":
					$createName = $this->trans->t("Document") . ".docx";
					break;
				case "cell":
					$createName = $this->trans->t("Spreadsheet") . ".xlsx";
					break;
				case "slide":
					$createName = $this->trans->t("Presentation") . ".pptx";
					break;
			}

			$createParam = [
				"dir" => "/",
				"name" => $createName
			];

			if (!empty($folderPath)) {
				$folder = $userFolder->get($folderPath);
				if (!empty($folder) && $folder->isCreatable()) {
					$createParam["dir"] = $folderPath;
				}
			}

			$createUrl = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".editor.create_new", $createParam);

			$params["editorConfig"]["createUrl"] = urldecode($createUrl);

			$templatesList = TemplateManager::getGlobalTemplates($file->getMimeType());
			if (!empty($templatesList)) {
				$templates = [];
				foreach ($templatesList as $templateItem) {
					$createParam["templateId"] = $templateItem->getId();
					$createParam["name"] = $templateItem->getName();

					array_push(
						$templates,
						[
						"image" => "",
						"title" => $templateItem->getName(),
						"url" => urldecode($this->urlGenerator->linkToRouteAbsolute($this->appName . ".editor.create_new", $createParam))
						]
					);
				}

				$params["editorConfig"]["templates"] = $templates;
			}

			if (!$template) {
				$params["document"]["info"]["favorite"] = $this->isFavorite($fileId);
			}
			$params["_file_path"] = $userFolder->getRelativePath($file->getPath());
		}

		$canGoBack = $folderLink !== null && $this->config->getSystemValue($this->config->customization_goback) !== false;
		if (!$desktop && $this->config->getSameTab()) {
			if ($inframe === true) {
				$params["editorConfig"]["customization"]["close"]["visible"] = true;
			} else {
				if ($canGoBack) {
					$params["editorConfig"]["customization"]["goback"] = [
						"url" => $folderLink,
						"blank" => false
					];
				}
			}
		} elseif ($canGoBack) {
			$params["editorConfig"]["customization"]["goback"] = [
				"url" => $folderLink
			];
		} elseif ($inframe === true && !empty($shareToken)) {
			$params["editorConfig"]["customization"]["close"]["visible"] = true;
		}

		if ($inframe === true) {
			$params["_files_sharing"] = \OC::$server->getAppManager()->isEnabledForUser("files_sharing");
		}

		$params = $this->setCustomization($params);

		if ($this->config->useDemo()) {
			$params["editorConfig"]["tenant"] = $this->config->getSystemValue("instanceid", true);
		}

		if ($anchor !== null) {
			try {
				$actionLink = json_decode($anchor, true);

				$params["editorConfig"]["actionLink"] = $actionLink;
			} catch (\Exception $e) {
				$this->logger->logException($e, ["message" => "Config: $fileId decode $anchor", "app" => $this->appName]);
			}
		}

		if (!empty($this->config->getDocumentServerUrl())) {
			$params["documentServerUrl"] = $this->config->getDocumentServerUrl();
		}

		if (!empty($this->config->getDocumentServerSecret())) {
			$now = time();
			$iat = $now;
			$exp = $now + $this->config->getJwtExpiration() * 60;
			$params["iat"] = $iat;
			$params["exp"] = $exp;
			$token = \Firebase\JWT\JWT::encode($params, $this->config->getDocumentServerSecret(), "HS256");
			$params["token"] = $token;
		}

		$this->logger->debug("Config is generated for: $fileId ($version) with key $key", ["app" => $this->appName]);

		return new JSONResponse($params);
	}

	/**
	 * Getting file by identifier
	 *
	 * @param string $userId - user identifier
	 * @param integer $fileId - file identifier
	 * @param string $filePath - file path
	 * @param bool $template - file is template
	 *
	 * @return array
	 */
	private function getFile($userId, $fileId, $filePath = null, $template = false) {
		if (empty($fileId)) {
			return [null, $this->trans->t("FileId is empty"), null];
		}

		try {
			$folder = !$template ? $this->root->getUserFolder($userId) : TemplateManager::getGlobalTemplateDir();
			$files = $folder->getById($fileId);
		} catch (\Exception $e) {
			$this->logger->logException($e, ["message" => "getFile: $fileId", "app" => $this->appName]);
			return [null, $this->trans->t("Invalid request"), null];
		}

		if (empty($files)) {
			$this->logger->info("Files not found: $fileId", ["app" => $this->appName]);
			return [null, $this->trans->t("File not found"), null];
		}

		$file = $files[0];

		if (\count($files) > 1 && !empty($filePath)) {
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
	 * @param bool $template - file is template
	 *
	 * @return string
	 */
	private function getUrl($file, $user = null, $shareToken = null, $version = 0, $changes = false, $template = false) {
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
		if ($template) {
			$data["template"] = true;
		}

		$hashUrl = $this->crypt->getHash($data);

		$fileUrl = $this->urlGenerator->linkToRouteAbsolute($this->appName . ".callback.download", ["doc" => $hashUrl]);

		if (!$this->config->useDemo() && !empty($this->config->getStorageUrl())) {
			$fileUrl = str_replace($this->urlGenerator->getAbsoluteURL("/"), $this->config->getStorageUrl(), $fileUrl);
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
		$instanceId = $this->config->getSystemValue("instanceid", true);
		$userId = $instanceId . "_" . $userId;
		return $userId;
	}

	/**
	 * Set customization parameters
	 *
	 * @param array $params - file parameters
	 *
	 * @return array
	 */
	private function setCustomization($params) {
		//default is true
		if ($this->config->getCustomizationChat() === false) {
			$params["editorConfig"]["customization"]["chat"] = false;
		}

		//default is false
		if ($this->config->getCustomizationCompactHeader() === true) {
			$params["editorConfig"]["customization"]["compactHeader"] = true;
		}

		//default is false
		if ($this->config->getCustomizationFeedback() === true) {
			$params["editorConfig"]["customization"]["feedback"] = true;
		}

		//default is false
		if ($this->config->getCustomizationForcesave() === true) {
			$params["editorConfig"]["customization"]["forcesave"] = true;
		}

		//default is true
		if ($this->config->getCustomizationHelp() === false) {
			$params["editorConfig"]["customization"]["help"] = false;
		}

		//default is original
		$reviewDisplay = $this->config->getCustomizationReviewDisplay();
		if ($reviewDisplay !== "original") {
			$params["editorConfig"]["customization"]["reviewDisplay"] = $reviewDisplay;
		}

		$theme = $this->config->getCustomizationTheme();
		if (isset($theme)) {
			$params["editorConfig"]["customization"]["uiTheme"] = $theme;
		}

		//default is false
		if ($this->config->getCustomizationToolbarNoTabs() === true) {
			$params["editorConfig"]["customization"]["toolbarNoTabs"] = true;
		}

		//default is true
		if ($this->config->getCustomizationMacros() === false) {
			$params["editorConfig"]["customization"]["macros"] = false;
		}

		//default is true
		if ($this->config->getCustomizationPlugins() === false) {
			$params["editorConfig"]["customization"]["plugins"] = false;
		}

		/* from system config */

		$autosave = $this->config->getSystemValue($this->config->customization_autosave);
		if (isset($autosave)) {
			$params["editorConfig"]["customization"]["autosave"] = $autosave;
		}

		$customer = $this->config->getSystemValue($this->config->customization_customer);
		if (isset($customer)) {
			$params["editorConfig"]["customization"]["customer"] = $customer;
		}

		$loaderLogo = $this->config->getSystemValue($this->config->customization_loaderLogo);
		if (isset($loaderLogo)) {
			$params["editorConfig"]["customization"]["loaderLogo"] = $loaderLogo;
		}

		$loaderName = $this->config->getSystemValue($this->config->customization_loaderName);
		if (isset($loaderName)) {
			$params["editorConfig"]["customization"]["loaderName"] = $loaderName;
		}

		$logo = $this->config->getSystemValue($this->config->customization_logo);
		if (isset($logo)) {
			$params["editorConfig"]["customization"]["logo"] = $logo;
		}

		$zoom = $this->config->getSystemValue($this->config->customization_zoom);
		if (isset($zoom)) {
			$params["editorConfig"]["customization"]["zoom"] = $zoom;
		}

		return $params;
	}

	/**
	 * Check file favorite
	 *
	 * @param integer $fileId - file identifier
	 *
	 * @return bool
	 */
	private function isFavorite($fileId) {
		$currentTags = $this->tagManager->load("files")->getTagsForObjects([$fileId]);
		if ($currentTags) {
			return \in_array(Tags::TAG_FAVORITE, $currentTags[$fileId]);
		}

		return false;
	}
}
