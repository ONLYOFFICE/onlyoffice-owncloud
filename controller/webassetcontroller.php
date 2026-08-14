<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
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

namespace OCA\Onlyoffice\Controller;

use OC\AppFramework\Http;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\Response;
use OCP\ILogger;
use OCP\IRequest;

/**
 * Class WebAssetController
 *
 * @package OCA\Onlyoffice\Controller
 */
class WebAssetController extends Controller {
	/**
	 * @var ILogger
	 */
	private $logger;

	/**
	 * WebAssetController constructor.
	 *
	 * @param string $AppName - application name
	 * @param IRequest $request - request object
	 * @param ILogger $logger
	 */
	public function __construct($AppName, IRequest $request, ILogger $logger) {
		parent::__construct($AppName, $request);
		$this->logger = $logger;
	}

	/**
	 * Loads the onlyoffice.js file for integration into ownCloud Web
	 *
	 * @PublicPage
	 * @NoCSRFRequired
	 *
	 * @return Response
	 */
	public function get(): Response {
		$basePath = \dirname(__DIR__, 1);
		$filePath = \realpath($basePath . '/js/web/onlyoffice.js');
		try {
			return new DataDisplayResponse(
				\file_get_contents($filePath),
				Http::STATUS_OK,
				[
				'Content-Type' => "text/javascript",
				'Content-Length' => \filesize($filePath),
				'Cache-Control' => 'max-age=0, no-cache, no-store, must-revalidate',
				'Pragma' => 'no-cache',
				'Expires' => 'Tue, 24 Sep 1985 22:15:00 GMT',
				'X-Frame-Options' => 'DENY'
				]
			);
		} catch(\Exception $e) {
			$this->logger->logException($e, ['app' => $this->appName]);
			return new DataResponse(["message" => $e->getMessage()], Http::STATUS_NOT_FOUND);
		}
	}
}
