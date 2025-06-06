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

(function (OCA) {
  OCA.Onlyoffice = _.extend(
    {
      AppName: "onlyoffice",
      context: null,
      folderUrl: null,
    },
    OCA.Onlyoffice
  );

  OCA.Onlyoffice.setting = {};
  OCA.Onlyoffice.mobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini|Macintosh/i.test(
      navigator.userAgent
    ) &&
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 1;

  OCA.Onlyoffice.CreateFile = function (
    name,
    fileList,
    templateId,
    targetPath,
    open = true
  ) {
    const dir = fileList.getCurrentDirectory();
    let winEditor = null;
    if (
      (!OCA.Onlyoffice.setting.sameTab ||
        OCA.Onlyoffice.mobile ||
        OCA.Onlyoffice.Desktop) &&
      open
    ) {
      $loaderUrl = OCA.Onlyoffice.Desktop
        ? ""
        : OC.filePath(OCA.Onlyoffice.AppName, "templates", "loader.html");
      winEditor = window.open($loaderUrl);
    }

    const createData = {
      name,
      dir,
    };

    if (templateId) {
      createData.templateId = templateId;
    }

    if (targetPath) {
      createData.targetPath = targetPath;
    }

    if ($("#isPublic").val()) {
      createData.shareToken = encodeURIComponent($("#sharingToken").val());
    }

    $.post(
      OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/new"),
      createData,
      function onSuccess(response) {
        if (response.error) {
          if (winEditor) {
            winEditor.close();
          }
          OC.Notification.show(response.error, {
            type: "error",
            timeout: 3,
          });
          return;
        }

        fileList.add(response, { animate: true });
        if (open) {
          const fileName = response.name;
          const extension = OCA.Onlyoffice.GetFileExtension(fileName);
          OCA.Onlyoffice.OpenEditor(
            response.id,
            dir,
            fileName,
            0,
            winEditor
          );
        }

        OCA.Onlyoffice.context = { fileList };
        OCA.Onlyoffice.context.fileName = response.name;

        OC.Notification.show(t(OCA.Onlyoffice.AppName, "File created"), {
          timeout: 3,
        });
      }
    );
  };

  OCA.Onlyoffice.OpenEditor = function (
    fileId,
    fileDir,
    fileName,
    version,
    winEditor
  ) {
    let filePath = "";
    if (fileName) {
      filePath = fileDir.replace(new RegExp("/$"), "") + "/" + fileName;
    }
    let url = OC.generateUrl(
      "/apps/" + OCA.Onlyoffice.AppName + "/{fileId}?filePath={filePath}",
      {
        fileId,
        filePath,
      }
    );

    if ($("#isPublic").val()) {
      url = OC.generateUrl(
        "apps/" + OCA.Onlyoffice.AppName + "/s/{shareToken}?fileId={fileId}",
        {
          shareToken: encodeURIComponent($("#sharingToken").val()),
          fileId,
        }
      );
    }

    if (version > 0) {
      url += "&version=" + version;
    }

    if (winEditor && winEditor.location) {
      winEditor.location.href = url;
    } else if (
      !OCA.Onlyoffice.setting.sameTab ||
      OCA.Onlyoffice.mobile ||
      OCA.Onlyoffice.Desktop
    ) {
      winEditor = window.open(url, "_blank");
    } else if (
      $("#isPublic").val() === "1" &&
      $("#mimetype").val() !== "httpd/unix-directory"
    ) {
      location.href = url;
    } else {
      const $iframe = $(
        '<iframe id="onlyoffice-frame" nonce="' +
          btoa(OC.requestToken) +
          '" scrolling="no" allowfullscreen src="' +
          url +
          '&inframe=true" />'
      );
      let scrollTop = 0;
      if ($("#app-content").length) {
        $("#app-content").append($iframe);

        scrollTop = $("#app-content").scrollTop();
      } else {
        $("#preview").append($iframe);

        scrollTop = $("#content-wrapper").scrollTop();
      }

      $("#onlyoffice-frame").css("top", scrollTop);

      $("body").addClass("onlyoffice-inline");
      OC.Apps.hideAppSidebar();

      $("html, body").scrollTop(0);

      OCA.Onlyoffice.folderUrl = location.href;
      window.history.pushState(null, null, url);
    }
  };

  OCA.Onlyoffice.CloseEditor = function () {
    $("body").removeClass("onlyoffice-inline");

    OCA.Onlyoffice.context = null;

    const url = OCA.Onlyoffice.folderUrl;
    if (!!url) {
      window.history.pushState(null, null, url);
      OCA.Onlyoffice.folderUrl = null;
    }

    OCA.Onlyoffice.bindVersionClick();
  };

  OCA.Onlyoffice.OpenShareDialog = function () {
    if (OCA.Onlyoffice.context) {
      if (!$("#app-content").hasClass("with-app-sidebar")) {
        OCA.Onlyoffice.context.fileList.showDetailsView(
          OCA.Onlyoffice.context.fileName,
          "shareTabView"
        );
        OC.Apps.showAppSidebar();
      } else {
        OC.Apps.hideAppSidebar();
      }
    }
  };

  OCA.Onlyoffice.RefreshVersionsDialog = function () {
    if (OCA.Onlyoffice.context) {
      if ($("#app-content").hasClass("with-app-sidebar")) {
        OC.Apps.hideAppSidebar();
        OCA.Onlyoffice.context.fileList.showDetailsView(
          OCA.Onlyoffice.context.fileName,
          "versionsTabView"
        );
        OC.Apps.showAppSidebar();
      }
    }
  };

  OCA.Onlyoffice.FileClick = function (fileName, context) {
    const fileInfoModel =
      context.fileInfoModel || context.fileList.getModelForFile(fileName);
    const fileId =
      (context.$file && context.$file[0].dataset.id) || fileInfoModel.id;
    const winEditor =
      !fileInfoModel && !OCA.Onlyoffice.setting.sameTab ? document : null;

    OCA.Onlyoffice.OpenEditor(fileId, context.dir, fileName, 0, winEditor);

    OCA.Onlyoffice.context = context;
    OCA.Onlyoffice.context.fileName = fileName;
  };

  OCA.Onlyoffice.FileConvertClick = function (fileName, context) {
    const fileInfoModel =
      context.fileInfoModel || context.fileList.getModelForFile(fileName);
    const fileList = context.fileList;
    const fileId = context.$file
      ? context.$file[0].dataset.id
      : fileInfoModel.id;

    const convertData = {
      fileId,
    };

    if ($("#isPublic").val()) {
      convertData.shareToken = encodeURIComponent($("#sharingToken").val());
    }

    $.post(
      OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/convert"),
      convertData,
      function onSuccess(response) {
        if (response.error) {
          OC.Notification.show(response.error, {
            type: "error",
            timeout: 3,
          });
          return;
        }

        if (response.parentId === fileList.dirInfo.id) {
          fileList.add(response, { animate: true });
        }

        OC.Notification.show(
          t(
            OCA.Onlyoffice.AppName,
            "File has been converted. Its content might look different."
          ),
          {
            timeout: 3,
          }
        );
      }
    );
  };

  OCA.Onlyoffice.DownloadClick = function (fileName, context) {
    const fileInfoModel =
      context.fileInfoModel || context.fileList.getModelForFile(fileName);

    $("#download-picker").remove();
    $.get(
      OC.filePath(OCA.Onlyoffice.AppName, "templates", "downloadPicker.html"),
      function (tmpl) {
        const dialog = $(tmpl).octemplate({
          dialog_name: "download-picker",
          dialog_title: t("onlyoffice", "Download as"),
        });

        $(dialog[0].querySelectorAll("p")).text(
          t(OCA.Onlyoffice.AppName, "Choose a format to convert {fileName}", {
            fileName,
          })
        );

        const extension = OCA.Onlyoffice.GetFileExtension(fileName);
        const selectNode = dialog[0].querySelectorAll("select")[0];
        const optionNodeOrigin = selectNode.querySelectorAll("option")[0];

        $(optionNodeOrigin).attr("data-value", extension);
        $(optionNodeOrigin).text(t(OCA.Onlyoffice.AppName, "Origin format"));

        dialog[0].dataset.format = extension;
        selectNode.onclick = function () {
          dialog[0].dataset.format = $(
            "#onlyoffice-download-select option:selected"
          ).attr("data-value");
        };

        OCA.Onlyoffice.setting.formats[extension].saveas.forEach((ext) => {
          const optionNode = optionNodeOrigin.cloneNode(true);

          $(optionNode).attr("data-value", ext);
          $(optionNode).text(ext);

          selectNode.append(optionNode);
        });

        $("body").append(dialog);

        $("#download-picker").ocdialog({
          closeOnEscape: true,
          modal: true,
          buttons: [
            {
              text: t("core", "Cancel"),
              classes: "cancel",
              click() {
                $(this).ocdialog("close");
              },
            },
            {
              text: t("onlyoffice", "Download"),
              classes: "primary",
              click() {
                const format = this.dataset.format;
                const fileId = fileInfoModel.id;
                const downloadLink = OC.generateUrl(
                  "apps/" +
                    OCA.Onlyoffice.AppName +
                    "/downloadas?fileId={fileId}&toExtension={toExtension}",
                  {
                    fileId,
                    toExtension: format,
                  }
                );

                location.href = downloadLink;
                $(this).ocdialog("close");
              },
            },
          ],
        });
      }
    );
  };

  OCA.Onlyoffice.OpenFormPicker = function (name, fileList) {
    const filterMimes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    OC.dialogs.filepicker(
      t(OCA.Onlyoffice.AppName, "Create new PDF form"),
      function (filePath) {
        OCA.Onlyoffice.CreateFile(name, fileList, 0, filePath);
      },
      false,
      filterMimes,
      true
    );
  };

  OCA.Onlyoffice.CreateFormClick = function (fileName, context) {
    const fileList = context.fileList;
    const name = fileName.replace(/\.[^.]+$/, ".pdf");

    const attr = context.fileInfoModel.attributes;
    const targetPath = attr.path + "/" + attr.name;

    OCA.Onlyoffice.CreateFile(name, fileList, 0, targetPath, false);
  };

  OCA.Onlyoffice.GetSettings = function (callbackSettings) {
    if (OCA.Onlyoffice.setting.formats) {
      callbackSettings();
    } else {
      $.get(
        OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/settings"),
        function onSuccess(settings) {
          OCA.Onlyoffice.setting = settings;

          callbackSettings();
        }
      );
    }
  };

  OCA.Onlyoffice.registerAction = function () {
    const register = function () {
      const formats = OCA.Onlyoffice.setting.formats;

      $.each(formats, function (ext, config) {
        if (!config.mime) {
          return true;
        }

        const mimeTypes = config.mime;
        mimeTypes.forEach((mime) => {
          OCA.Files.fileActions.registerAction({
            name: "onlyofficeOpen",
            displayName: t(OCA.Onlyoffice.AppName, "Open in ONLYOFFICE"),
            mime,
            permissions: OC.PERMISSION_READ,
            iconClass: "icon-onlyoffice-open",
            actionHandler: OCA.Onlyoffice.FileClick,
          });

          if (config.def) {
            OCA.Files.fileActions.setDefault(mime, "onlyofficeOpen");
          }

          if (config.conv) {
            OCA.Files.fileActions.registerAction({
              name: "onlyofficeConvert",
              displayName: t(OCA.Onlyoffice.AppName, "Convert with ONLYOFFICE"),
              mime,
              permissions: $("#isPublic").val()
                ? OC.PERMISSION_UPDATE
                : OC.PERMISSION_READ,
              iconClass: "icon-onlyoffice-convert",
              actionHandler: OCA.Onlyoffice.FileConvertClick,
            });
          }

          if (config.createForm) {
            OCA.Files.fileActions.registerAction({
              name: "onlyofficeCreateForm",
              displayName: t(OCA.Onlyoffice.AppName, "Create form"),
              mime,
              permissions: $("#isPublic").val()
                ? OC.PERMISSION_UPDATE
                : OC.PERMISSION_READ,
              iconClass: "icon-onlyoffice-create",
              actionHandler: OCA.Onlyoffice.CreateFormClick,
            });
          }

          if (config.saveas && !$("#isPublic").val()) {
            OCA.Files.fileActions.registerAction({
              name: "onlyofficeDownload",
              displayName: t(OCA.Onlyoffice.AppName, "Download as"),
              mime,
              permissions: OC.PERMISSION_READ,
              iconClass: "icon-onlyoffice-download",
              actionHandler: OCA.Onlyoffice.DownloadClick,
            });
          }
        });
      });
    };

    OCA.Onlyoffice.GetSettings(register);
  };

  OCA.Onlyoffice.NewFileMenu = {
    attach(menu) {
      const fileList = menu.fileList;

      if (fileList.id !== "files" && fileList.id !== "files.public") {
        return;
      }

      menu.addMenuEntry({
        id: "onlyofficeDocx",
        displayName: t(OCA.Onlyoffice.AppName, "Document"),
        templateName: t(OCA.Onlyoffice.AppName, "Document"),
        iconClass: "icon-onlyoffice-new-docx",
        fileType: "docx",
        actionHandler(name) {
          if (
            !$("#isPublic").val() &&
            OCA.Onlyoffice.TemplateExist("document")
          ) {
            OCA.Onlyoffice.OpenTemplatePicker(name, ".docx", "document");
          } else {
            OCA.Onlyoffice.CreateFile(name + ".docx", fileList);
          }
        },
      });

      menu.addMenuEntry({
        id: "onlyofficeXlsx",
        displayName: t(OCA.Onlyoffice.AppName, "Spreadsheet"),
        templateName: t(OCA.Onlyoffice.AppName, "Spreadsheet"),
        iconClass: "icon-onlyoffice-new-xlsx",
        fileType: "xlsx",
        actionHandler(name) {
          if (
            !$("#isPublic").val() &&
            OCA.Onlyoffice.TemplateExist("spreadsheet")
          ) {
            OCA.Onlyoffice.OpenTemplatePicker(name, ".xlsx", "spreadsheet");
          } else {
            OCA.Onlyoffice.CreateFile(name + ".xlsx", fileList);
          }
        },
      });

      menu.addMenuEntry({
        id: "onlyofficePpts",
        displayName: t(OCA.Onlyoffice.AppName, "Presentation"),
        templateName: t(OCA.Onlyoffice.AppName, "Presentation"),
        iconClass: "icon-onlyoffice-new-pptx",
        fileType: "pptx",
        actionHandler(name) {
          if (
            !$("#isPublic").val() &&
            OCA.Onlyoffice.TemplateExist("presentation")
          ) {
            OCA.Onlyoffice.OpenTemplatePicker(name, ".pptx", "presentation");
          } else {
            OCA.Onlyoffice.CreateFile(name + ".pptx", fileList);
          }
        },
      });

      menu.addMenuEntry({
        id: "onlyofficePdf",
        displayName: t(OCA.Onlyoffice.AppName, "PDF form"),
        templateName: t(OCA.Onlyoffice.AppName, "PDF form"),
        iconClass: "icon-onlyoffice-new-pdf",
        fileType: "pdf",
        actionHandler(name) {
          OCA.Onlyoffice.CreateFile(name + ".pdf", fileList);
        },
      });

      if (!$("#isPublic").val()) {
        menu.addMenuEntry({
          id: "onlyofficePdfExist",
          displayName: t(
            OCA.Onlyoffice.AppName,
            "PDF form from existing text file"
          ),
          templateName: t(
            OCA.Onlyoffice.AppName,
            "PDF form from existing text file"
          ),
          iconClass: "icon-onlyoffice-new-pdf",
          fileType: "pdf",
          actionHandler(name) {
            OCA.Onlyoffice.OpenFormPicker(name + ".pdf", fileList);
          },
        });
      }
    },
  };

  OCA.Onlyoffice.GetFileExtension = function (fileName) {
    const extension = fileName
      .substr(fileName.lastIndexOf(".") + 1)
      .toLowerCase();
    return extension;
  };

  OCA.Onlyoffice.openVersion = function (fileId, version) {
    if ($("body").hasClass("onlyoffice-inline")) {
      $("#onlyoffice-frame")[0].contentWindow.OCA.Onlyoffice.onRequestHistory(
        version
      );
      return;
    }

    OCA.Onlyoffice.OpenEditor(fileId, "", "", version);
  };

  OCA.Onlyoffice.bindVersionClick = function () {
    OCA.Onlyoffice.unbindVersionClick();
    $(document).on(
      "click.onlyoffice-version",
      "#versionsTabView .downloadVersion",
      function () {
        const ext = OCA.Onlyoffice.GetFileExtension(
          $("#app-sidebar .fileName h3").text()
        );
        if (
          !OCA.Onlyoffice.setting.formats[ext] ||
          !OCA.Onlyoffice.setting.formats[ext].def
        ) {
          return true;
        }

        const versionNodes = $("#versionsTabView ul.versions>li");
        const versionNode = $(this).closest(
          "#versionsTabView ul.versions>li"
        )[0];

        const href = $(this).attr("href");
        const search = new RegExp("/meta/(\\d+)/v/\\d+");
        const result = search.exec(href);
        let fileId = null;
        if (result && result.length > 1) {
          fileId = result[1];
        }

        const versionNum =
          versionNodes.length - $.inArray(versionNode, versionNodes);

        OCA.Onlyoffice.openVersion(fileId || "", versionNum);

        return false;
      }
    );
  };

  OCA.Onlyoffice.unbindVersionClick = function () {
    $(document).off(
      "click.onlyoffice-version",
      "#versionsTabView .downloadVersion"
    );
  };

  const initPage = function () {
    if (
      $("#isPublic").val() === "1" &&
      $("#mimetype").val() !== "httpd/unix-directory"
    ) {
      const fileName = $("#filename").val();
      const extension = OCA.Onlyoffice.GetFileExtension(fileName);

      const initSharedButton = function () {
        const formats = OCA.Onlyoffice.setting.formats;

        const config = formats[extension];
        if (!config) {
          return;
        }

        const editorUrl = OC.generateUrl(
          "apps/" +
            OCA.Onlyoffice.AppName +
            "/s/" +
            encodeURIComponent($("#sharingToken").val())
        );

        if (
          oc_appswebroots.richdocuments ||
          (oc_appswebroots.files_pdfviewer && extension === "pdf") ||
          (oc_appswebroots.files_texteditor && extension === "txt")
        ) {
          const button = document.createElement("a");
          button.href = editorUrl;
          button.className = "onlyoffice-public-open button";
          button.innerText = t(OCA.Onlyoffice.AppName, "Open in ONLYOFFICE");

          if (!OCA.Onlyoffice.setting.sameTab) {
            button.target = "_blank";
          }

          $("#preview").prepend(button);
        } else {
          const $iframe = $(
            '<iframe id="onlyoffice-frame" nonce="' +
              btoa(OC.requestToken) +
              '" scrolling="no" allowfullscreen src="' +
              editorUrl +
              '?inframe=true" />'
          );
          $("#preview").append($iframe);
        }
      };

      OCA.Onlyoffice.GetSettings(initSharedButton);
    } else {
      OC.Plugins.register("OCA.Files.NewFileMenu", OCA.Onlyoffice.NewFileMenu);

      OCA.Onlyoffice.registerAction();

      OCA.Onlyoffice.bindVersionClick();

      if (OCA.Onlyoffice.Share) {
        OCA.Onlyoffice.Share();
      }
    }
  };

  $(document).ready(initPage);
})(OCA);
