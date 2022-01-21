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

use OCP\Migration\IOutput;
use OCP\Migration\IRepairStep;
use OCP\Files\IMimeTypeDetector;

use OCA\Onlyoffice\AppConfig;

class MimeRepair implements IRepairStep {

    private const MIMETYPELIST = "mimetypelist.js";
    private const CUSTOM_MIMETYPEALIASES = "mimetypealiases.json";

    private const DOCUMENT_ALIAS = "x-office/document";

    /**
     * Application name
     *
     * @var string
     */
    private static $appName = "onlyoffice";

    public function __construct() {
        $this->config = new AppConfig(self::$appName);
    }

    /**
     * Returns the step's name
     */
    public function getName() {
        return self::$appName;
    }

    /**
     * @param IOutput $output
     */
    public function run(IOutput $output) {
        \OC::$server->getLogger()->debug("Mimetypes repair run", ["app" => self::$appName]);

        $customAliasPath = \OC::$SERVERROOT . "/config/" . self::CUSTOM_MIMETYPEALIASES;

        $formats = $this->config->FormatsSetting();
        $mimes = [
            $formats["docxf"]["mime"] => self::DOCUMENT_ALIAS,
            $formats["oform"]["mime"] => self::DOCUMENT_ALIAS
        ];

        $customAlias = $mimes;
        if (file_exists($customAliasPath)) {
            $customAlias = json_decode(file_get_contents($customAliasPath), true);
            foreach ($mimes as $mime => $icon) {
                if (!isset($customAlias[$mime])) {
                    $customAlias[$mime] = $icon;
                }
            }
        }

        file_put_contents($customAliasPath, json_encode($customAlias, JSON_PRETTY_PRINT));

        //matches the command maintenance:mimetype:update-js
        //from OC\Core\Command\Maintenance\Mimetype\UpdateJS
        $detector = \OC::$server->getMimeTypeDetector();

        \file_put_contents(
            \OC::$SERVERROOT . "/core/js/" . self::MIMETYPELIST,
            $this->generateMimeTypeListContent(
                $detector->getAllAliases(),
                $this->getFiles(),
                $this->getThemes()
            ));
    }

    /**
     * Copy OC\Core\Command\Maintenance\Mimetype\UpdateJS
     *
     * @return array
     */
    private function getFiles() {
        $dir = new \DirectoryIterator(\OC::$SERVERROOT . "/core/img/filetypes");

        $files = [];
        foreach ($dir as $fileInfo) {
            if ($fileInfo->isFile()) {
                $files[] = \preg_replace("/.[^.]*$/", "", $fileInfo->getFilename());
            }
        }

        $files = \array_values(\array_unique($files));
        \sort($files);
        return $files;
    }

    /**
     * Copy OC\Core\Command\Maintenance\Mimetype\UpdateJS
     *
     * @param $themeDirectory
     *
     * @return array
     */
    private function getFileTypeIcons($themeDirectory) {
        $fileTypeIcons = [];
        $fileTypeIconDirectory = $themeDirectory . "/core/img/filetypes";

        if (\is_dir($fileTypeIconDirectory)) {
            $fileTypeIconFiles = new \DirectoryIterator($fileTypeIconDirectory);
            foreach ($fileTypeIconFiles as $fileTypeIconFile) {
                if ($fileTypeIconFile->isFile()) {
                    $fileTypeIconName = \preg_replace("/.[^.]*$/", "", $fileTypeIconFile->getFilename());
                    $fileTypeIcons[] = $fileTypeIconName;
                }
            }
        }

        $fileTypeIcons = \array_values(\array_unique($fileTypeIcons));
        \sort($fileTypeIcons);

        return $fileTypeIcons;
    }

    /**
     * Copy OC\Core\Command\Maintenance\Mimetype\UpdateJS
     *
     * @return array
     */
    private function getThemes() {
        return \array_merge(
            $this->getAppThemes(),
            $this->getLegacyThemes()
        );
    }

    /**
     * Copy OC\Core\Command\Maintenance\Mimetype\UpdateJS
     *
     * @return array
     */
    private function getAppThemes() {
        $themes = [];

        $apps = \OC_App::getEnabledApps();

        foreach ($apps as $app) {
            if (\OC_App::isType($app, "theme")) {
                $themes[$app] = $this->getFileTypeIcons(\OC_App::getAppPath($app));
            }
        }

        return $themes;
    }

    /**
     * Copy OC\Core\Command\Maintenance\Mimetype\UpdateJS
     *
     * @return array
     */
    private function getLegacyThemes() {
        $themes = [];

        if (\is_dir(\OC::$SERVERROOT . "/themes/")) {
            $legacyThemeDirectories = new \DirectoryIterator(\OC::$SERVERROOT . "/themes/");

            foreach ($legacyThemeDirectories as $legacyThemeDirectory) {
                if ($legacyThemeDirectory->isFile() || $legacyThemeDirectory->isDot()) {
                    continue;
                }
                $themes[$legacyThemeDirectory->getFilename()] = $this->getFileTypeIcons(
                    $legacyThemeDirectory->getPathname()
                );
            }
        }

        return $themes;
    }

    /**
     * Copy OC\Core\Command\Maintenance\Mimetype\UpdateJS
     *
     * @param array $aliases
     * @param array $files
     * @param array $themes
     *
     * @return string
     */
    private function generateMimeTypeListContent($aliases, $files, $themes) {
        $aliasesJson = \json_encode($aliases, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $filesJson = \json_encode($files, JSON_PRETTY_PRINT);
        $themesJson = \json_encode($themes, JSON_PRETTY_PRINT);

        $content = <<< MTLC
/**
* This file is automatically generated
* DO NOT EDIT MANUALLY!
*
* You can update the list of MimeType Aliases in config/mimetypealiases.json
* The list of files is fetched from core/img/filetypes
* To regenerate this file run ./occ maintenance:mimetype:update-js
*/
OC.MimeTypeList={
    aliases: $aliasesJson,
    files: $filesJson,
    themes: $themesJson
};
MTLC;

        return $content;
    }
}