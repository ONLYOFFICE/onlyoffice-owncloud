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
                                FileInfo $sourceFileInfo
                                ) {
        $this->timestamp = $timestamp;
        $this->revisionId = $revisionId;
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
}
