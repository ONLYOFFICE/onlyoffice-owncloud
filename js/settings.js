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

(function ($, OC) {
  $(document).ready(function () {
    OCA.Onlyoffice = _.extend(
      {
        AppName: "onlyoffice",
      },
      OCA.Onlyoffice
    );

    const advToogle = function () {
      $("#onlyofficeSecretPanel").toggleClass("onlyoffice-hide");
      $("#onlyoffice-adv .icon").toggleClass("icon-triangle-s icon-triangle-n");
    };

    if (
      $("#onlyofficeInternalUrl").val().length ||
      $("#onlyofficeStorageUrl").val().length ||
      $("#onlyofficeJwtHeader").val().length
    ) {
      advToogle();
    }

    $("#onlyoffice-adv").click(function () {
      advToogle();
    });

    $("#onlyofficeGroups").prop(
      "checked",
      $("#onlyofficeLimitGroups").val() !== ""
    );

    const groupListToggle = function () {
      if ($("#onlyofficeGroups").prop("checked")) {
        OC.Settings.setupGroupsSelect($("#onlyofficeLimitGroups"));
      } else {
        $("#onlyofficeLimitGroups").select2("destroy");
      }
    };

    $("#onlyofficeGroups").click(groupListToggle);
    groupListToggle();

    const demoToggle = function () {
      $("#onlyofficeAddrSettings input:not(#onlyofficeStorageUrl)").prop(
        "disabled",
        $("#onlyofficeDemo").prop("checked")
      );
    };

    $("#onlyofficeDemo").click(demoToggle);
    demoToggle();

    const connectionError = document.getElementById(
      "onlyofficeSettingsState"
    ).value;
    if (connectionError !== "") {
      const message =
        t(OCA.Onlyoffice.AppName, "Error when trying to connect") +
        " (" +
        connectionError +
        ")";
      OC.Notification.show(message, {
        timeout: 3,
        type: "error",
      });
    }

    $("#onlyoffice-addr-save").click(function () {
      $(".section-onlyoffice").addClass("icon-loading");
      const onlyofficeUrl = $("#onlyofficeUrl").val().trim();

      if (!onlyofficeUrl.length) {
        $(
          "#onlyofficeInternalUrl, #onlyofficeStorageUrl, #onlyofficeSecret, #onlyofficeJwtHeader"
        ).val("");
      }

      const onlyofficeInternalUrl = (
        $("#onlyofficeInternalUrl").val() || ""
      ).trim();
      const onlyofficeStorageUrl = (
        $("#onlyofficeStorageUrl").val() || ""
      ).trim();
      const onlyofficeVerifyPeerOff = $("#onlyofficeVerifyPeerOff").prop(
        "checked"
      );
      const onlyofficeSecret = ($("#onlyofficeSecret").val() || "").trim();
      const jwtHeader = ($("#onlyofficeJwtHeader").val() || "").trim();
      const demo = $("#onlyofficeDemo").prop("checked");

      $.ajax({
        method: "PUT",
        url: OC.generateUrl(
          "apps/" + OCA.Onlyoffice.AppName + "/ajax/settings/address"
        ),
        data: {
          documentserver: onlyofficeUrl,
          documentserverInternal: onlyofficeInternalUrl,
          storageUrl: onlyofficeStorageUrl,
          verifyPeerOff: onlyofficeVerifyPeerOff,
          secret: onlyofficeSecret,
          jwtHeader,
          demo,
        },
        success: function onSuccess(response) {
          $(".section-onlyoffice").removeClass("icon-loading");
          if (response && (response.documentserver != null || demo)) {
            $("#onlyofficeUrl").val(response.documentserver);
            $("#onlyofficeInternalUrl").val(response.documentserverInternal);
            $("#onlyofficeStorageUrl").val(response.storageUrl);
            $("#onlyofficeSecret").val(response.secret);
            $("#onlyofficeJwtHeader").val(response.jwtHeader);

            $(".section-onlyoffice-2").toggleClass(
              "onlyoffice-hide",
              (response.documentserver == null && !demo) ||
                !!response.error.length
            );

            if (!response.error && response.secret === null) {
              OC.dialogs.info(
                t(
                  OCA.Onlyoffice.AppName,
                  "Server settings have been successfully updated"
                ) +
                  ". " +
                  t(
                    OCA.Onlyoffice.AppName,
                    "To ensure the security of important parameters in ONLYOFFICE Docs requests, please set a Secret Key on the Settings page."
                  ),
                t(OCA.Onlyoffice.AppName, "Info")
              );
            } else {
              const message = response.error
                ? t(OCA.Onlyoffice.AppName, "Error when trying to connect") +
                  " (" +
                  response.error +
                  ")"
                : t(
                    OCA.Onlyoffice.AppName,
                    "Server settings have been successfully updated"
                  );

              const versionMessage = response.version
                ? " (" +
                  t(OCA.Onlyoffice.AppName, "version") +
                  " " +
                  response.version +
                  ")"
                : "";

              OC.Notification.show(message + versionMessage, {
                type: response.error ? "error" : null,
                timeout: 3,
              });
            }
          } else {
            $(".section-onlyoffice-2").addClass("onlyoffice-hide");
          }
        },
      });
    });

    $("#onlyoffice-save").click(function () {
      $(".section-onlyoffice").addClass("icon-loading");

      const defFormats = {};
      $('input[id^="onlyofficeDefFormat"]').each(function () {
        defFormats[this.name] = this.checked;
      });

      const editFormats = {};
      $('input[id^="onlyofficeEditFormat"]').each(function () {
        editFormats[this.name] = this.checked;
      });

      const sameTab = $("#onlyofficeSameTab").is(":checked");
      const preview = $("#onlyofficePreview").is(":checked");
      const cronChecker = $("#onlyofficeCronChecker").is(":checked");
      const emailNotifications = $("#onlyofficeEmailNotifications").is(
        ":checked"
      );
      const versionHistory = $("#onlyofficeVersionHistory").is(":checked");

      const limitGroupsString = $("#onlyofficeGroups").prop("checked")
        ? $("#onlyofficeLimitGroups").val()
        : "";
      const limitGroups = limitGroupsString ? limitGroupsString.split("|") : [];

      const chat = $("#onlyofficeChat").is(":checked");
      const compactHeader = $("#onlyofficeCompactHeader").is(":checked");
      const feedback = $("#onlyofficeFeedback").is(":checked");
      const forcesave = $("#onlyofficeForcesave").is(":checked");
      const liveViewOnShare = $("#onlyofficeLiveViewOnShare").is(":checked");
      const help = $("#onlyofficeHelp").is(":checked");
      const reviewDisplay = $(
        "input[type='radio'][name='reviewDisplay']:checked"
      )
        .attr("id")
        .replace("onlyofficeReviewDisplay_", "");
      const theme = $("input[type='radio'][name='theme']:checked")
        .attr("id")
        .replace("onlyofficeTheme_", "");
      const unknownAuthor = $("#onlyofficeUnknownAuthor").val().trim();

      $.ajax({
        method: "PUT",
        url: OC.generateUrl(
          "apps/" + OCA.Onlyoffice.AppName + "/ajax/settings/common"
        ),
        data: {
          defFormats,
          editFormats,
          sameTab,
          preview,
          cronChecker,
          emailNotifications,
          versionHistory,
          limitGroups,
          chat,
          compactHeader,
          feedback,
          forcesave,
          liveViewOnShare,
          help,
          reviewDisplay,
          theme,
          unknownAuthor,
        },
        success: function onSuccess(response) {
          $(".section-onlyoffice").removeClass("icon-loading");
          if (response) {
            const message = t(
              OCA.Onlyoffice.AppName,
              "Common settings have been successfully updated"
            );
            OC.Notification.show(message, {
              timeout: 3,
            });
          }
        },
      });
    });

    $("#onlyofficeSecuritySave").click(function () {
      $(".section-onlyoffice").addClass("icon-loading");

      const plugins = $("#onlyofficePlugins").is(":checked");
      const macros = $("#onlyofficeMacros").is(":checked");
      const protection = $("input[type='radio'][name='protection']:checked")
        .attr("id")
        .replace("onlyofficeProtection_", "");

      $.ajax({
        method: "PUT",
        url: OC.generateUrl(
          "apps/" + OCA.Onlyoffice.AppName + "/ajax/settings/security"
        ),
        data: {
          plugins,
          macros,
          protection,
        },
        success: function onSuccess(response) {
          $(".section-onlyoffice").removeClass("icon-loading");
          if (response) {
            const message = t(
              OCA.Onlyoffice.AppName,
              "Security settings have been successfully updated"
            );
            OC.Notification.show(message, {
              timeout: 3,
            });
          }
        },
      });
    });

    $(".section-onlyoffice input").keypress(function (e) {
      const code = e.keyCode || e.which;
      if (code === 13) {
        $("#onlyoffice-addr-save").click();
      }
    });

    $("#onlyofficeSecret-show").click(function () {
      if ($("#onlyofficeSecret").attr("type") === "password") {
        $("#onlyofficeSecret").attr("type", "text");
      } else {
        $("#onlyofficeSecret").attr("type", "password");
      }
    });

    $("#onlyofficeClearVersionHistory").click(function () {
      OC.dialogs.confirm(
        t(OCA.Onlyoffice.AppName, 'Are you sure you want to clear metadata?'),
        t(OCA.Onlyoffice.AppName, 'Confirm metadata removal'),
        (clicked) => {
          if (!clicked) {
            return
          }

          $(".section-onlyoffice").addClass("icon-loading");

          $.ajax({
            method: "DELETE",
            url: OC.generateUrl(
              "apps/" + OCA.Onlyoffice.AppName + "/ajax/settings/history"
            ),
            success: function onSuccess(response) {
              $(".section-onlyoffice").removeClass("icon-loading");
              if (response) {
                const message = t(
                  OCA.Onlyoffice.AppName,
                  "All history successfully deleted"
                );
                OC.Notification.show(message, {
                  timeout: 3,
                });
              }
            },
          });
        },
      )
    });

    $("#onlyofficeAddTemplate").change(function () {
      const file = this.files[0];

      $(".section-onlyoffice").addClass("icon-loading");
      OCA.Onlyoffice.AddTemplate(file, (template, error) => {
        $(".section-onlyoffice").removeClass("icon-loading");
        const message = error
          ? t(OCA.Onlyoffice.AppName, "Error") + ": " + error
          : t(OCA.Onlyoffice.AppName, "Template successfully added");

        OC.Notification.show(message, {
          type: error ? "error" : null,
          timeout: 3,
        });
        if (template) {
          OCA.Onlyoffice.AttachItemTemplate(template);
        }
      });
    });

    $(document).on("click", ".onlyoffice-template-delete", function (event) {
      const item = $(event.target).parents(".onlyoffice-template-item");
      const templateId = $(item).attr("data-id");

      $(".section-onlyoffice").addClass("icon-loading");
      OCA.Onlyoffice.DeleteTemplate(templateId, (response) => {
        $(".section-onlyoffice").removeClass("icon-loading");

        const message = response.error
          ? t(OCA.Onlyoffice.AppName, "Error") + ": " + response.error
          : t(OCA.Onlyoffice.AppName, "Template successfully deleted");
        OC.Notification.show(message, {
          type: response.error ? "error" : null,
          timeout: 3,
        });
        if (!response.error) {
          $(item).detach();
        }
      });
    });

    $(document).on("click", ".onlyoffice-template-item p", function (event) {
      const item = $(event.target).parents(".onlyoffice-template-item");
      const templateId = $(item).attr("data-id");

      const url = OC.generateUrl(
        "/apps/" + OCA.Onlyoffice.AppName + "/{fileId}?template={template}",
        {
          fileId: templateId,
          template: "true",
        }
      );

      window.open(url);
    });

    $(document).on("click", ".onlyoffice-template-download", function (event) {
      const item = $(event.target).parents(".onlyoffice-template-item");
      const templateId = $(item).attr("data-id");

      const downloadLink = OC.generateUrl(
        "apps/" +
          OCA.Onlyoffice.AppName +
          "/downloadas?fileId={fileId}&template={template}",
        {
          fileId: templateId,
          template: "true",
        }
      );

      location.href = downloadLink;
    });
  });
})(jQuery, OC);
