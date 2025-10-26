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

style("onlyoffice", "settings");
style("onlyoffice", "template");
script("onlyoffice", "settings");
script("onlyoffice", "template");
?>
<div class="section section-onlyoffice">
	<h2 id="onlyoffice">
		ONLYOFFICE
	</h2>

    <div class="onlyoffice-description">
        <h1><?php p($l->t("Welcome to ONLYOFFICE Docs!")) ?></h1>
        <p><?php p($l->t("Create, edit, and co-author documents, sheets, slides, and PDFs within ownCloud using ONLYOFFICE Docs.")) ?></p>
        <div class="useful-links">
            <a href="https://helpcenter.onlyoffice.com/integration/owncloud.aspx" target="_blank"><?php p($l->t("Learn more")) ?></a>
            <a href="https://feedback.onlyoffice.com/forums/966080-your-voice-matters?category_id=519288" target="_blank"><?php p($l->t("Suggest a feature")) ?></a>
        </div>
    </div>

	<h2><?php p($l->t("Server settings")) ?></h2>

<?php if ($_["encryption"] === true) { ?>
	<p class="onlyoffice-error">
	<?php p($l->t("Encryption App is enabled, the application cannot work. You can continue working with the application if you enable master key.")) ?>
	</p>
<?php } ?>
	<div id="onlyofficeAddrSettings">
		<p><?php p($l->t("ONLYOFFICE Docs Location specifies the address of the server with the document services installed. Please change the '<documentserver>' for the server address in the below line.")) ?></p>
		<p class="onlyoffice-header"><?php p($l->t("ONLYOFFICE Docs address")) ?></p>
		<p><input id="onlyofficeUrl" value="<?php p($_["documentserver"]) ?>" placeholder="https://<documentserver>/" type="text"></p>

		<p>
		<input type="checkbox" class="checkbox" id="onlyofficeVerifyPeerOff"
			<?php if ($_["verifyPeerOff"]) { ?>checked="checked"<?php } ?> />
		<label for="onlyofficeVerifyPeerOff"><?php p($l->t("Disable certificate verification (insecure)")) ?></label>
		</p>

		<p class="onlyoffice-header"><?php p($l->t("Secret key (leave blank to disable)")) ?></p>
		<p>
			<input id="onlyofficeSecret" value="<?php p($_["secret"]) ?>" placeholder="secret" type="password" />
			<input type="checkbox" id="personal-show" name="show">
			<label id="onlyofficeSecret-show" for="personal-show"></label>
		</p>

		<p>
			<a id="onlyoffice-adv" class="onlyoffice-header">
				<?php p($l->t("Advanced server settings")) ?>
				<span class="icon icon-triangle-s"></span>
			</a>
		</p>
		<div id="onlyofficeSecretPanel" class="onlyoffice-hide">
			<p class="onlyoffice-header"><?php p($l->t("Authorization header (leave blank to use default header)")) ?></p>
			<p><input id="onlyofficeJwtHeader" value="<?php p($_["jwtHeader"]) ?>" placeholder="Authorization" type="text"></p>
			<p class="onlyoffice-header"><?php p($l->t("ONLYOFFICE Docs address for internal requests from the server")) ?></p>
			<p><input id="onlyofficeInternalUrl" value="<?php p($_["documentserverInternal"]) ?>" placeholder="https://<documentserver>/" type="text"></p>
			<p class="onlyoffice-header"><?php p($l->t("Server address for internal requests from ONLYOFFICE Docs")) ?></p>
			<p><input id="onlyofficeStorageUrl" value="<?php p($_["storageUrl"]) ?>" placeholder="<?php p($_["currentServer"]) ?>" type="text"></p>
		</div>
		<br />
	</div>

	<div>
		<button id="onlyoffice-addr-save" class="button"><?php p($l->t("Save")) ?></button>
		<div class="onlyoffice-demo">
			<input type="checkbox" class="checkbox" id="onlyofficeDemo"
			<?php if ($_["demo"]["enabled"]) { ?>checked="checked"<?php } ?>
			<?php if (!$_["demo"]["available"]) { ?>disabled="disabled"<?php } ?> />
			<label for="onlyofficeDemo"><?php p($l->t("Connect to demo ONLYOFFICE Docs server")) ?></label>
			<br />
			<?php if ($_["demo"]["available"]) { ?>
			<em><?php p($l->t("This is a public test server, please do not use it for private sensitive data. The server will be available during a 30-day period.")) ?></em>
			<?php } else { ?>
			<em><?php p($l->t("The 30-day test period is over, you can no longer connect to demo ONLYOFFICE Docs server.")) ?></em>
			<?php } ?>
		</div>

		<div id="onlyoffice-docscloud-banner-wrapper">
			<div id="onlyoffice-docscloud-banner-pic-wrapper">
				<div id="onlyoffice-docscloud-banner-pic">
				</div>
			</div>
			<div id="onlyoffice-docscloud-banner-content">
				<div id="onlyoffice-docscloud-banner-content-text">
					<p><h2><?php p($l->t("ONLYOFFICE Docs Cloud")) ?></h2></p>
					<p><?php p($l->t("Easily launch the editors in the cloud without downloading and installation")) ?></p>
				</div>
			<div id="onlyoffice-docscloud-banner-content-button-wrapper">
				<a id="onlyoffice-docscloud-banner-content-button" class="button" href="<?php p($_["linkToDocs"]) ?>" target="_blank">
				<?php p($l->t("Get Now")) ?>
				</a>
			</div>
		</div>
	</div>
</div>

	<div class="section-onlyoffice-2 <?php if (empty($_["documentserver"]) && !$_["demo"]["enabled"] || !$_["successful"]) { ?>onlyoffice-hide<?php } ?>">
	<br />
		<h2><?php p($l->t("Common settings")) ?></h2>
		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeGroups"
			<?php if (\count($_["limitGroups"]) > 0) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeGroups"><?php p($l->t("Allow the following groups to access the editors")) ?></label>
			<br />
			<input type="hidden" id="onlyofficeLimitGroups" value="<?php p(implode("|", $_["limitGroups"])) ?>"
			style="display: block; margin-top: 6px; width: 265px;" />
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficePreview"
			<?php if ($_["preview"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficePreview"><?php p($l->t("Use ONLYOFFICE to generate a document preview (it will take up disk space)")) ?></label>
		</p>

		<p>
 			<input type="checkbox" class="checkbox" id="onlyofficeSameTab"
			<?php if ($_["sameTab"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeSameTab"><?php p($l->t("Open file in the same tab")) ?></label>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeVersionHistory"
			<?php if ($_["versionHistory"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeVersionHistory"><?php p($l->t("Keep metadata for each version once the document is edited (it will take up disk space)")) ?></label>
			<button id="onlyofficeClearVersionHistory" class="button"><?php p($l->t("Clear")) ?></button>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeCronChecker"
				<?php if ($_["cronChecker"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeCronChecker"><?php p($l->t("Enable background connection check to the editors")) ?></label>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeEmailNotifications"
				<?php if ($_["emailNotifications"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeEmailNotifications"><?php p($l->t("Enable e-mail notifications")) ?></label>
		</p>

		<p class="onlyoffice-header"><?php p($l->t("Unknown author display name")) ?></p>
		<p><input id="onlyofficeUnknownAuthor" value="<?php p($_["unknownAuthor"]) ?>" placeholder="" type="text"></p>

		<p class="onlyoffice-header"><?php p($l->t("The default application for opening the format")) ?></p>
		<div class="onlyoffice-exts">
			<?php foreach ($_["formats"] as $format => $setting) { ?>
			<?php if (\array_key_exists("mime", $setting)) { ?>
		<div>
			<input type="checkbox" class="checkbox"
			id="onlyofficeDefFormat<?php p($format) ?>"
			name="<?php p($format) ?>"
		<?php if (\array_key_exists("def", $setting) && $setting["def"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeDefFormat<?php p($format) ?>"><?php p($format) ?></label>
			</div>
			<?php } ?>
			<?php } ?>
		</div>

		<p class="onlyoffice-header">
			<?php p($l->t("Open the file for editing (due to format restrictions, the data might be lost when saving to the formats from the list below)")) ?>
		</p>
		<div class="onlyoffice-exts">
			<?php foreach ($_["formats"] as $format => $setting) { ?>
			<?php if (\array_key_exists("editable", $setting) && $setting["editable"]) { ?>
		<div>
			<input type="checkbox" class="checkbox"
			id="onlyofficeEditFormat<?php p($format) ?>"
			name="<?php p($format) ?>"
			<?php if (\array_key_exists("edit", $setting) && $setting["edit"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeEditFormat<?php p($format) ?>"><?php p($format) ?></label>
		</div>
		<?php } ?>
	<?php } ?>
	</div>
<br />

		<h2>
			<?php p($l->t("Editor customization settings")) ?>
		</h2>

		<p>
		<input type="checkbox" class="checkbox" id="onlyofficeForcesave"
			<?php if ($_["forcesave"]) { ?>checked="checked"<?php } ?>
			<?php if ($_["encryption"] !== false) { ?>disabled="disabled"<?php } ?>/>
		<label for="onlyofficeForcesave"><?php p($l->t("Keep intermediate versions when editing (forcesave)")) ?></label>
		<?php if ($_["encryption"] !== false) { ?>
			<br />
			<em class="onlyoffice-option-desc"><?php p($l->t("This feature is unavailable due to encryption settings.")) ?></em>
		<?php } ?>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeLiveViewOnShare"
			<?php if ($_["liveViewOnShare"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeLiveViewOnShare"><?php p($l->t("Enable live-viewing mode when accessing file by public link")) ?></label>
		</p>

		<p class="onlyoffice-header">
			<?php p($l->t("The customization section allows personalizing the editor interface")) ?>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeChat"
			<?php if ($_["chat"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeChat"><?php p($l->t("Display Chat menu button")) ?></label>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeCompactHeader"
			<?php if ($_["compactHeader"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeCompactHeader"><?php p($l->t("Display the header more compact")) ?></label>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeFeedback"
			<?php if ($_["feedback"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeFeedback"><?php p($l->t("Display Feedback & Support menu button")) ?></label>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeHelp"
			<?php if ($_["help"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeHelp"><?php p($l->t("Display Help menu button")) ?></label>
		</p>

		<p class="onlyoffice-header">
			<?php p($l->t("Review mode for viewing")) ?>
		</p>
		<div class="onlyoffice-tables">
			<div>
				<input type="radio" class="radio"
				id="onlyofficeReviewDisplay_markup"
				name="reviewDisplay"
				<?php if ($_["reviewDisplay"] === "markup") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeReviewDisplay_markup"><?php p($l->t("Markup")) ?></label>
			</div>
			<div>
				<input type="radio" class="radio"
				id="onlyofficeReviewDisplay_final"
				name="reviewDisplay"
				<?php if ($_["reviewDisplay"] === "final") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeReviewDisplay_final"><?php p($l->t("Final")) ?></label>
			</div>
			<div>
				<input type="radio" class="radio"
				id="onlyofficeReviewDisplay_original"
				name="reviewDisplay"
				<?php if ($_["reviewDisplay"] === "original") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeReviewDisplay_original"><?php p($l->t("Original")) ?></label>
			</div>
		</div>

		<p class="onlyoffice-header">
			<?php p($l->t("Default editor theme")) ?>
		</p>
		<div class="onlyoffice-tables">
			<div>
				<input type="radio" class="radio"
				id="onlyofficeTheme_theme-system"
				name="theme"
				<?php if ($_["theme"] === "theme-system") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeTheme_theme-system"><?php p($l->t("Same as system")) ?></label>
			</div>
			<div>
				<input type="radio" class="radio"
				id="onlyofficeTheme_default-light"
				name="theme"
				<?php if ($_["theme"] === "default-light") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeTheme_default-light"><?php p($l->t("Light")) ?></label>
			</div>
			<div>
				<input type="radio" class="radio"
				id="onlyofficeTheme_default-dark"
				name="theme"
				<?php if ($_["theme"] === "default-dark") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeTheme_default-dark"><?php p($l->t("Dark")) ?></label>
			</div>
		</div>

		<br />
		<p><button id="onlyoffice-save" class="button"><?php p($l->t("Save")) ?></button></p>

		<h2>
			<?php p($l->t("Common templates")) ?>
			<input id="onlyofficeAddTemplate" type="file" class="hidden-visually" />
			<label for="onlyofficeAddTemplate" class="onlyoffice-template icon-add" title="<?php p($l->t("Add a new template")) ?>"></label>
		</h2>
		<ul class="onlyoffice-template-container">
			<?php foreach ($_["templates"] as $template) { ?>
				<li data-id=<?php p($template["id"]) ?> class="onlyoffice-template-item" >
					<img src="/core/img/filetypes/x-office-<?php p($template["type"]) ?>.svg" />
					<p><?php p($template["name"]) ?></p>
					<span class="onlyoffice-template-download"></span>
					<span class="onlyoffice-template-delete icon-delete"></span>
				</li>
		<?php } ?>
		</ul>
		<br/>

		<h2><?php p($l->t("Security")) ?></h2>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficePlugins"
			<?php if ($_["plugins"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficePlugins"><?php p($l->t("Enable plugins")) ?></label>
		</p>

		<p>
			<input type="checkbox" class="checkbox" id="onlyofficeMacros"
			<?php if ($_["macros"]) { ?>checked="checked"<?php } ?> />
			<label for="onlyofficeMacros"><?php p($l->t("Run document macros")) ?></label>
		</p>

		<p class="onlyoffice-header">
		<?php p($l->t("Enable document protection for")) ?>
		</p>
		<div class="onlyoffice-tables">
			<div>
				<input type="radio" class="radio"
				id="onlyofficeProtection_all"
				name="protection"
				<?php if ($_["protection"] === "all") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeProtection_all"><?php p($l->t("All users")) ?></label>
			</div>
			<div>
				<input type="radio" class="radio"
				id="onlyofficeProtection_owner"
				name="protection"
				<?php if ($_["protection"] === "owner") { ?>checked="checked"<?php } ?> />
				<label for="onlyofficeProtection_owner"><?php p($l->t("Owner only")) ?></label>
			</div>
		</div>

		<br />
		<p><button id="onlyofficeSecuritySave" class="button"><?php p($l->t("Save")) ?></button></p>
	</div>
	<input type ="hidden" id="onlyofficeSettingsState" value="<?php p($_["settingsError"]) ?>" />
</div>
