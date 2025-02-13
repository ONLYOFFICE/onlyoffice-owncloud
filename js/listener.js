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
      titleBase: window.document.title,
      favIconBase: $('link[rel="icon"]').attr("href"),
    },
    OCA.Onlyoffice
  );

  OCA.Onlyoffice.onRequestClose = function () {
    $("#onlyoffice-frame").remove();

    OCA.Onlyoffice.CloseEditor();
  };

  OCA.Onlyoffice.onRequestSaveAs = function (saveData) {
    OC.dialogs.filepicker(
      t(OCA.Onlyoffice.AppName, "Save as"),
      function (fileDir) {
        saveData.dir = fileDir;
        $("#onlyoffice-frame")[0].contentWindow.OCA.Onlyoffice.editorSaveAs(
          saveData
        );
      },
      false,
      "httpd/unix-directory",
      true
    );
  };

  OCA.Onlyoffice.onRequestInsertImage = function (imageMimes) {
    OC.dialogs.filepicker(
      t(OCA.Onlyoffice.AppName, "Insert image"),
      $("#onlyoffice-frame")[0].contentWindow.OCA.Onlyoffice.editorInsertImage,
      false,
      imageMimes,
      true
    );
  };

  OCA.Onlyoffice.onRequestMailMergeRecipients = function (recipientMimes) {
    OC.dialogs.filepicker(
      t(OCA.Onlyoffice.AppName, "Select recipients"),
      $("#onlyoffice-frame")[0].contentWindow.OCA.Onlyoffice.editorSetRecipient,
      false,
      recipientMimes,
      true
    );
  };

  OCA.Onlyoffice.onRequestSelectDocument = function (
    revisedMimes,
    documentSelectionType
  ) {
    let title;
    switch (documentSelectionType) {
      case "combine":
        title = t(OCA.Onlyoffice.AppName, "Select file to combine");
        break;
      case "compare":
        title = t(OCA.Onlyoffice.AppName, "Select file to compare");
        break;
      case "insert-text":
        title = t(OCA.Onlyoffice.AppName, "Select file to insert text");
        break;
      default:
        title = t(OCA.Onlyoffice.AppName, "Select file");
    }
    OC.dialogs.filepicker(
      title,
      $(
        "#onlyoffice-frame"
      )[0].contentWindow.OCA.Onlyoffice.editorSetRequested.bind({
        documentSelectionType,
      }),
      false,
      revisedMimes,
      true
    );
  };

  OCA.Onlyoffice.onRequestReferenceSource = function (referenceSourceMimes) {
    OC.dialogs.filepicker(
      t(OCA.Onlyoffice.AppName, "Select data source"),
      $("#onlyoffice-frame")[0].contentWindow.OCA.Onlyoffice
        .editorReferenceSource,
      false,
      referenceSourceMimes,
      true
    );
  };

  OCA.Onlyoffice.onDocumentReady = function (documentType) {
    if (
      documentType === "word" ||
      documentType === "cell" ||
      documentType === "slide"
    ) {
      OCA.Onlyoffice.bindVersionClick();
    } else {
      OCA.Onlyoffice.unbindVersionClick();
    }

    OCA.Onlyoffice.setViewport();
  };

  OCA.Onlyoffice.changeFavicon = function (favicon) {
    $('link[rel="icon"]').attr("href", favicon);
  };

  OCA.Onlyoffice.setViewport = function () {
    document
      .querySelector('meta[name="viewport"]')
      .setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
      );
  };

  OCA.Onlyoffice.onShowMessage = function (messageObj) {
    OC.Notification.show(messageObj.message, messageObj.props);
  };

  window.addEventListener(
    "message",
    function (event) {
      if ($("#onlyoffice-frame")[0]) {
        if (
          $("#onlyoffice-frame")[0].contentWindow !== event.source ||
          !event.data["method"]
        ) {
          return;
        }
      }
      switch (event.data.method) {
        case "editorRequestClose":
          OCA.Onlyoffice.onRequestClose();
          break;
        case "editorRequestSharingSettings":
          if (OCA.Onlyoffice.OpenShareDialog) {
            OCA.Onlyoffice.OpenShareDialog();
          }
          break;
        case "onRefreshVersionsDialog":
          if (OCA.Onlyoffice.RefreshVersionsDialog) {
            OCA.Onlyoffice.RefreshVersionsDialog();
          }
          break;
        case "editorRequestSaveAs":
          OCA.Onlyoffice.onRequestSaveAs(event.data.param);
          break;
        case "editorRequestInsertImage":
          OCA.Onlyoffice.onRequestInsertImage(event.data.param);
          break;
        case "editorRequestMailMergeRecipients":
          OCA.Onlyoffice.onRequestMailMergeRecipients(event.data.param);
          break;
        case "editorRequestSelectDocument":
          OCA.Onlyoffice.onRequestSelectDocument(
            event.data.param,
            event.data.documentSelectionType
          );
          break;
        case "editorRequestReferenceSource":
          OCA.Onlyoffice.onRequestReferenceSource(event.data.param);
          break;
        case "onDocumentReady":
          OCA.Onlyoffice.onDocumentReady(event.data.param);
          break;
        case "changeFavicon":
          OCA.Onlyoffice.changeFavicon(event.data.param);
          break;
        case "onShowMessage":
          OCA.Onlyoffice.onShowMessage(event.data.param);
          break;
      }
    },
    false
  );

  window.addEventListener("popstate", function (event) {
    if (
      $("#onlyoffice-frame").length &&
      location.href.indexOf(OCA.Onlyoffice.AppName) === -1
    ) {
      OCA.Onlyoffice.onRequestClose();
    }
  });

  const mutationObserver = new MutationObserver(mutationRecords => {
    if (mutationRecords[0] && mutationRecords[0].removedNodes) {
      mutationRecords[0].removedNodes.forEach((node) => {
        if (node.id && node.id === "onlyoffice-frame") {
          OCA.Onlyoffice.changeFavicon(
            OCA.Onlyoffice.favIconBase
          );
          window.document.title = OCA.Onlyoffice.titleBase;
        }
      })
    }
  });

  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterDataOldValue: true,
    });
})(OCA);
