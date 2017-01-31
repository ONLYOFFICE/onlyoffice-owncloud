<?php
/**
 *
 * (c) Copyright Ascensio System Limited 2010-2017
 *
 * This program is freeware. You can redistribute it and/or modify it under the terms of the GNU 
 * General Public License (GPL) version 3 as published by the Free Software Foundation (https://www.gnu.org/copyleft/gpl.html). 
 * In accordance with Section 7(a) of the GNU GPL its Section 15 shall be amended to the effect that 
 * Ascensio System SIA expressly excludes the warranty of non-infringement of any third-party rights.
 *
 * THIS PROGRAM IS DISTRIBUTED WITHOUT ANY WARRANTY; WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR
 * FITNESS FOR A PARTICULAR PURPOSE. For more details, see GNU GPL at https://www.gnu.org/copyleft/gpl.html
 *
 * You can contact Ascensio System SIA by email at sales@onlyoffice.com
 *
 * The interactive user interfaces in modified source and object code versions of ONLYOFFICE must display 
 * Appropriate Legal Notices, as required under Section 5 of the GNU GPL version 3.
 *
 * Pursuant to Section 7 § 3(b) of the GNU GPL you must retain the original ONLYOFFICE logo which contains 
 * relevant author attributions when distributing the software. If the display of the logo in its graphic 
 * form is not reasonably feasible for technical reasons, you must include the words "Powered by ONLYOFFICE" 
 * in every copy of the program you distribute. 
 * Pursuant to Section 7 § 3(e) we decline to grant you any rights under trademark law for use of our trademarks.
 *
*/

namespace OCA\Onlyoffice;

use OCP\IL10N;

use OCA\Onlyoffice\AppConfig;

/**
 * Class service connector to Document Service
 *
 * @package OCA\Onlyoffice
 */
class DocumentService {

    /**
     * l10n service
     *
     * @var IL10N
     */
    private $trans;

    /**
     * Application configuration
     *
     * @var OCA\Onlyoffice\AppConfig
     */
    private $config;

    /**
     * @param OCA\Onlyoffice\AppConfig $config application configutarion
     */
    public function __construct(IL10N $trans, AppConfig $appConfig) {
        $this->trans = $trans;
        $this->config = $appConfig;
    }

    /**
    * Translation key to a supported form.
    *
    * @param string $expected_key  Expected key
    *
    * @return Supported key
    */
    public static function GenerateRevisionId($expected_key) {
        if (strlen($expected_key) > 20) {
            $expected_key = crc32( $expected_key);
        }
        $key = preg_replace("[^0-9-.a-zA-Z_=]", "_", $expected_key);
        $key = substr($key, 0, min(array(strlen($key), 20)));
        return $key;
    }

    /**
    * The method is to convert the file to the required format
    * 
    * @param string $document_uri - Uri for the document to convert
    * @param string $from_extension - Document extension
    * @param string $to_extension - Extension to which to convert
    * @param string $document_revision_id - Key for caching on service
    * @param bool $is_async - Perform conversions asynchronously
    * @param string $converted_document_uri - Uri to the converted document
    *
    * @return The percentage of completion of conversion
    */
    function GetConvertedUri($document_uri, $from_extension, $to_extension, $document_revision_id, $is_async, &$converted_document_uri) {
        $converted_document_uri = "";
        $responceFromConvertService = $this->SendRequestToConvertService($document_uri, $from_extension, $to_extension, $document_revision_id, $is_async);

        $errorElement = $responceFromConvertService->Error;
        if ($errorElement->count() > 0) {
            $this->ProcessConvServResponceError($errorElement."");
        }

        $isEndConvert = $responceFromConvertService->EndConvert;
        $percent = $responceFromConvertService->Percent . "";

        if ($isEndConvert !== NULL && strtolower($isEndConvert) === "true") {
            $converted_document_uri = $responceFromConvertService->FileUrl;
            $percent = 100;
        } else if ($percent >= 100) {
            $percent = 99;
        }

        return $percent;
    }

    /**
    * Request for conversion to a service
    *
    * @param string $document_uri - Uri for the document to convert
    * @param string $from_extension - Document extension
    * @param string $to_extension - Extension to which to convert
    * @param string $document_revision_id - Key for caching on service
    * @param bool - $is_async - Perform conversions asynchronously
    *
    * @return Xml document request result of conversion
    */
    function SendRequestToConvertService($document_uri, $from_extension, $to_extension, $document_revision_id, $is_async) {
        if (empty($from_extension)) {
            $path_parts = pathinfo($document_uri);
            $from_extension = $path_parts["extension"];
        }

        $title = basename($document_uri);
        if (empty($title)) {
            $title = $document_revision_id . $from_extension;
        }

        if (empty($document_revision_id)) {
            $document_revision_id = $document_uri;
        }

        $document_revision_id = self::GenerateRevisionId($document_revision_id);

        $documentServerUrl = $this->config->GetDocumentServerUrl();

        if (empty($documentServerUrl)) {
            throw new \Exception($this->trans->t("ONLYOFFICE app not configured. Please contact admin"));
        }

        $urlToConverter = $documentServerUrl . "/ConvertService.ashx";

        $data = json_encode(
            array(
                "async" => $is_async,
                "url" => $document_uri,
                "outputtype" => trim($to_extension, "."),
                "filetype" => trim($from_extension, "."),
                "title" => $title,
                "key" => $document_revision_id
            )
        );

        $response_xml_data;
        $countTry = 0;

        $opts = array("http" => array(
                    "method"  => "POST",
                    "timeout" => "120000",
                    "header"=> "Content-type: application/json\r\n",
                    "content" => $data
                )
            );

        if (substr($urlToConverter, 0, strlen("https")) === "https") {
            $opts["ssl"] = array( "verify_peer"   => FALSE );
        }
 
        $context  = stream_context_create($opts);
        $ServiceConverterMaxTry = 3;
        while ($countTry < $ServiceConverterMaxTry) {
            $countTry = $countTry + 1;
            $response_xml_data = file_get_contents($urlToConverter, FALSE, $context);
            if ($response_xml_data !== false){ break; }
        }

        if ($countTry === $ServiceConverterMaxTry) {
            throw new \Exception ($this->trans->t("Bad Request or timeout error"));
        }

        libxml_use_internal_errors(true);
        if (!function_exists("simplexml_load_file")) {
             throw new \Exception($this->trans->t("Server can't read xml"));
        }
        $response_data = simplexml_load_string($response_xml_data);
        if (!$response_data) {
            $exc = $this->trans->t("Bad Response. Errors: ");
            foreach(libxml_get_errors() as $error) {
                $exc = $exc . "\t" . $error->message;
            }
            throw new \Exception ($exc);
        }

        return $response_data;
    }

    /**
    * Generate an error code table
    *
    * @param string $errorCode - Error code
    *
    * @return null
    */
    function ProcessConvServResponceError($errorCode) {
        $errorMessageTemplate = $this->trans->t("Error occurred in the document service: ");
        $errorMessage = "";

        switch ($errorCode) {
            case -8:
                $errorMessage = $errorMessageTemplate . "Error document VKey";
                break;
            case -7:
                $errorMessage = $errorMessageTemplate . "Error document request";
                break;
            case -6:
                $errorMessage = $errorMessageTemplate . "Error database";
                break;
            case -5:
                $errorMessage = $errorMessageTemplate . "Error unexpected guid";
                break;
            case -4:
                $errorMessage = $errorMessageTemplate . "Error download error";
                break;
            case -3:
                $errorMessage = $errorMessageTemplate . "Error convertation error";
                break;
            case -2:
                $errorMessage = $errorMessageTemplate . "Error convertation timeout";
                break;
            case -1:
                $errorMessage = $errorMessageTemplate . "Error convertation unknown";
                break;
            case 0:
                break;
            default:
                $errorMessage = $errorMessageTemplate . "ErrorCode = " . $errorCode;
                break;
        }

        throw new \Exception($errorMessage);
    }
}
