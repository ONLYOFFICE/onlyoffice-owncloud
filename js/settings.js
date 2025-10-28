/**
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

            if (response.error.length === 0 && response.secret === null) {
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
                    "Settings have been successfully updated"
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
              "Settings have been successfully updated"
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
              "Settings have been successfully updated"
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
