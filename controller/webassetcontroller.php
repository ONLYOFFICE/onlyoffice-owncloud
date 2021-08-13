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

namespace OCA\Onlyoffice\Controller;

use GuzzleHttp\Mimetypes;
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
        $basePath = \dirname(__DIR__,1);
        $filePath = \realpath( $basePath . '/js/web/onlyoffice.js');
        try {
            return new DataDisplayResponse(\file_get_contents($filePath), Http::STATUS_OK, [
                'Content-Type' => $this->getMimeType($filePath),
                'Content-Length' => \filesize($filePath),
                'Cache-Control' => 'max-age=0, no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => 'Tue, 24 Sep 1985 22:15:00 GMT',
                'X-Frame-Options' => 'DENY'
            ]);
        } catch(\Exception $e) {
            $this->logger->logException($e, ['app' => $this->appName]);
            return new DataResponse(["message" => $e->getMessage()], Http::STATUS_NOT_FOUND);
        }
    }

    private function getMimeType(string $filename): string {
        $mimeTypes = Mimetypes::getInstance();
        return $mimeTypes->fromFilename($filename);
    }
}
