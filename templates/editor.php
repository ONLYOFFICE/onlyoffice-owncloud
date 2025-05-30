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

style("onlyoffice", "editor");
script("onlyoffice", "desktop");
script("onlyoffice", "editor");
?>

<div id="app">
	<div id="iframeEditor"
	data-id="<?php p($_["fileId"]) ?>"
	data-path="<?php p($_["filePath"]) ?>"
	data-sharetoken="<?php p($_["shareToken"]) ?>"
	data-version="<?php p($_["version"]) ?>"
	data-template="<?php p($_["template"]) ?>"
	data-anchor="<?php p($_["anchor"]) ?>"
	data-inframe="<?php p($_["inframe"]) ?>"></div>
</div>
