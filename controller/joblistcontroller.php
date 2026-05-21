<?php
/*
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
use OC\BackgroundJob\TimedJob;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\Response;
use OCP\BackgroundJob\IJob;
use OCP\BackgroundJob\IJobList;
use OCP\ILogger;
use OCP\IRequest;

use OCA\Onlyoffice\Cron\EditorsCheck;
use OCA\Onlyoffice\AppConfig;

/**
 * Class JobListController
 *
 * @package OCA\Onlyoffice\Controller
 */
class JobListController extends Controller {
	/**
	 * Logger
	 *
	 * @var ILogger
	 */
	private $logger;

	/**
	 * Job list
	 *
	 * @var IJobList
	 */
	private $jobList;

	/**
	 * Application configuration
	 *
	 * @var AppConfig
	 */
	private $config;

	/**
	 * JobListController constructor.
	 *
	 * @param string $AppName - application name
	 * @param IRequest $request - request object
	 * @param ILogger $logger
	 * @param AppConfig $config - application configuration
	 * @param IJobList $jobList - job list
	 */
	public function __construct($AppName, IRequest $request, ILogger $logger, AppConfig $config, IJobList $jobList) {
		parent::__construct($AppName, $request);
		$this->logger = $logger;
		$this->config = $config;
		$this->jobList = $jobList;
	}

	/**
	 * Add a job to list
	 *
	 * @param IJob|string $job
	 *
	 * @return void
	 */
	private function addJob($job) {
		if (!$this->jobList->has($job, null)) {
			$this->jobList->add($job);
			$this->logger->debug("Job '" . $job . "' added to JobList.", ["app" => $this->appName]);
		}
	}

	/**
	 * Remove a job from list
	 *
	 * @param IJob|string $job
	 *
	 * @return void
	 */
	private function removeJob($job) {
		if ($this->jobList->has($job, null)) {
			$this->jobList->remove($job);
			$this->logger->debug("Job '" . $job . "' removed from JobList.", ["app" => $this->appName]);
		}
	}

	/**
	 * Add or remove EditorsCheck job depending on the value of _editors_check_interval
	 *
	 * @return void
	 */
	private function checkEditorsCheckJob() {
		if (!$this->config->getCronChecker()) {
			$this->removeJob(EditorsCheck::class);
			return;
		}
		if ($this->config->getEditorsCheckInterval() > 0) {
			$this->addJob(EditorsCheck::class);
		} else {
			$this->removeJob(EditorsCheck::class);
		}
	}

	/**
	 * Method for sequentially calling checks of all jobs
	 *
	 * @return void
	 */
	public function checkAllJobs() {
		$this->checkEditorsCheckJob();
	}
}
