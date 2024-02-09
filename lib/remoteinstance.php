<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
 * (c) Copyright Ascensio System SIA 2024
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

use OCP\Files\File;

use OCA\Files_Sharing\External\Storage as SharingExternalStorage;

/**
 * Remote instance manager
 *
 * @package OCA\Onlyoffice
 */
class RemoteInstance {
	/**
	 * App name
	 */
	private const APP_NAME = "onlyoffice";

	/**
	 * Table name
	 */
	private const TABLENAME_KEY = "onlyoffice_instance";

	/**
	 * Time to live of remote instance (12 hours)
	 */
	private static $ttl = 60 * 60 * 12;

	/**
	 * Health remote list
	 */
	private static $healthRemote = [];

	/**
	 * Get remote instance
	 *
	 * @param string $remote - remote instance
	 *
	 * @return array
	 */
	private static function get($remote) {
		$connection = \OC::$server->getDatabaseConnection();
		$select = $connection->prepare(
			"
            SELECT remote, expire, status
            FROM  `*PREFIX*" . self::TABLENAME_KEY . "`
            WHERE `remote` = ?
        "
		);
		$result = $select->execute([$remote]);

		$dbremote = $result ? $select->fetch() : [];

		return $dbremote;
	}

	/**
	 * Store remote instance
	 *
	 * @param string $remote - remote instance
	 * @param bool $status - remote status
	 *
	 * @return bool
	 */
	private static function set($remote, $status) {
		$connection = \OC::$server->getDatabaseConnection();
		$insert = $connection->prepare(
			"
            INSERT INTO `*PREFIX*" . self::TABLENAME_KEY . "`
                (`remote`, `status`, `expire`)
            VALUES (?, ?, ?)
        "
		);
		return (bool)$insert->execute([$remote, $status === true ? 1 : 0, time()]);
	}

	/**
	 * Update remote instance
	 *
	 * @param string $remote - remote instance
	 * @param bool $status - remote status
	 *
	 * @return bool
	 */
	private static function update($remote, $status) {
		$connection = \OC::$server->getDatabaseConnection();
		$update = $connection->prepare(
			"
            UPDATE `*PREFIX*" . self::TABLENAME_KEY . "`
            SET status = ?, expire = ?
            WHERE remote = ?
        "
		);
		return (bool)$update->execute([$status === true ? 1 : 0, time(), $remote]);
	}

	/**
	 * Health check remote instance
	 *
	 * @param string $remote - remote instance
	 *
	 * @return bool
	 */
	public static function healthCheck($remote) {
		$logger = \OC::$server->getLogger();
		$remote = rtrim($remote, "/") . "/";

		if (\in_array($remote, self::$healthRemote)) {
			$logger->debug("Remote instance " . $remote . " from local cache status " . $dbremote["status"], ["app" => self::APP_NAME]);
			return true;
		}

		$dbremote = self::get($remote);
		if (!empty($dbremote) && $dbremote["expire"] + self::$ttl > time()) {
			$logger->debug("Remote instance " . $remote . " from database status " . $dbremote["status"], ["app" => self::APP_NAME]);
			self::$healthRemote[$remote] = $dbremote["status"];
			return self::$healthRemote[$remote];
		}

		$httpClientService = \OC::$server->getHTTPClientService();
		$client = $httpClientService->newClient();

		$status = false;
		try {
			$response = $client->get($remote . "ocs/v2.php/apps/" . self::APP_NAME . "/api/v1/healthcheck?format=json");
			$body = json_decode($response->getBody(), true);

			$data = $body["ocs"]["data"];
			if (isset($data["alive"])) {
				$status = $data["alive"] === true;
			}
		} catch (\Exception $e) {
			$logger->logException($e, ["message" => "Failed to request federated health check for" . $remote, "app" => self::APP_NAME]);
		}

		if (empty($dbremote)) {
			self::set($remote, $status);
		} else {
			self::update($remote, $status);
		}

		$logger->debug("Remote instance " . $remote . " was stored to database status " . $dbremote["status"], ["app" => self::APP_NAME]);

		self::$healthRemote[$remote] = $status;

		return self::$healthRemote[$remote];
	}

	/**
	 * Generate unique document identifier in federated share
	 *
	 * @param File $file - file
	 *
	 * @return string
	 */
	public function getRemoteKey($file) {
		$logger = \OC::$server->getLogger();

		$remote = $file->getStorage()->getRemote();
		$shareToken = $file->getStorage()->getToken();
		$internalPath = $file->getInternalPath();

		$httpClientService = \OC::$server->getHTTPClientService();
		$client = $httpClientService->newClient();

		try {
			$response = $client->post(
				$remote . "/ocs/v2.php/apps/" . self::APP_NAME . "/api/v1/key?format=json",
				[
				"timeout" => 5,
				"json" => [
					"shareToken" => $shareToken,
					"path" => $internalPath
				]
				]
			);

			$body = \json_decode($response->getBody(), true);

			$data = $body["ocs"]["data"];
			if (!empty($data["error"])) {
				$logger->error("Error federated key " . $data["error"], ["app" => self::APP_NAME]);
				return null;
			}

			$key = $data["key"];
			$logger->debug("Federated key: $key", ["app" => self::APP_NAME]);

			return $key;
		} catch (\Exception $e) {
			$logger->logException($e, ["message" => "Failed to request federated key " . $file->getId(), "app" => self::APP_NAME]);

			if ($e->getResponse()->getStatusCode() === 404) {
				self::update($remote, false);
				$logger->debug("Changed status for remote instance $remote to false", ["app" => self::APP_NAME]);
			}

			return null;
		}
	}

	/**
	 * Change lock status in the federated share
	 *
	 * @param File $file - file
	 * @param bool $lock - status
	 * @param bool $fs - status
	 *
	 * @return bool
	 */
	public static function lockRemoteKey($file, $lock, $fs) {
		$logger = \OC::$server->getLogger();
		$action = $lock ? "lock" : "unlock";

		$remote = $file->getStorage()->getRemote();
		$shareToken = $file->getStorage()->getToken();
		$internalPath = $file->getInternalPath();

		$httpClientService = \OC::$server->getHTTPClientService();
		$client = $httpClientService->newClient();
		$data = [
			"timeout" => 5,
			"json" => [
				"shareToken" => $shareToken,
				"path" => $internalPath,
				"lock" => $lock
			]
		];
		if (!empty($fs)) {
			$data["json"]["fs"] = $fs;
		}

		try {
			$response = $client->post($remote . "/ocs/v2.php/apps/" . self::APP_NAME . "/api/v1/keylock?format=json", $data);
			$body = \json_decode($response->getBody(), true);

			$data = $body["ocs"]["data"];

			if (empty($data)) {
				$logger->debug("Federated request" . $action . "for " . $file->getFileInfo()->getId() . " is successful", ["app" => self::APP_NAME]);
				return true;
			}

			if (!empty($data["error"])) {
				$logger->error("Error" . $action . "federated key for " . $file->getFileInfo()->getId() . ": " . $data["error"], ["app" => self::APP_NAME]);
				return false;
			}
		} catch(\Exception $e) {
			$logger->logException($e, ["message" => "Failed to request federated " . $action . " for " . $file->getFileInfo()->getId(), "app" => self::APP_NAME]);
			return false;
		}
	}

	/**
	 * Check of federated capable
	 *
	 * @param File $file - file
	 *
	 * @return bool
	 */
	public static function isRemoteFile($file) {
		$storage = $file->getStorage();

		$alive = false;
		$isFederated = $storage->instanceOfStorage(SharingExternalStorage::class);
		if (!$isFederated) {
			return false;
		}

		$alive = RemoteInstance::healthCheck($storage->getRemote());
		return $alive;
	}
}
