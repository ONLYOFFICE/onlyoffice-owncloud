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

use OCP\Files\FileInfo;


/**
 * Version file
 *
 * @package OCA\Onlyoffice
 */
class Version {
    /** 
     * Time of creation
     * 
     * @var int 
     * */
    private $timestamp;

    /** 
     * Version file
     * 
     * @var int|string 
     * */
    private $revisionId;

    /** 
     * File path
     *
     * @var string 
     * */
    private $path;

    /** 
     * Source file properties
     * 
     * @var FileInfo 
     * */
    private $sourceFileInfo;

    /**
     * @param int $timestamp - file time stamp
     * @param int $revisionId - revision id
     * @param FileInfo $sourceFileInfo - source file info
     */
    public function __construct(int $timestamp,
                                int $revisionId,
                                string $path,
                                FileInfo $sourceFileInfo
                                ) {
        $this->timestamp = $timestamp;
        $this->revisionId = $revisionId;
        $this->path = $path;
        $this->sourceFileInfo = $sourceFileInfo;
    }

    /**
     * Get source file
     *
     * @return FileInfo
     */
    public function getSourceFile() {
        return $this->sourceFileInfo;
    }

    /**
     * Get version file
     *
     * @return int|string
     */
    public function getRevisionId() {
        return $this->revisionId;
    }

    /**
     * Get timestamp file
     *
     * @return int
     */
    public function getTimestamp() {
        return $this->timestamp;
    }

    /**
     * Get file path
     *
     * @return string
     */
    public function getPath() {
        return $this->path;
    }
}
