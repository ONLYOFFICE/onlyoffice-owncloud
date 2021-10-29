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

(function (OCA) {

    OCA.Onlyoffice = _.extend({
            AppName: "onlyoffice",
        }, OCA.Onlyoffice);

    OCA.Onlyoffice.onRequestClose = function () {

        $("#onlyofficeFrame").remove();

        OCA.Onlyoffice.CloseEditor();
    };

    OCA.Onlyoffice.onRequestSaveAs = function (saveData) {
        OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Save as"),
            function (fileDir) {
                saveData.dir = fileDir;
                $("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.editorSaveAs(saveData);
            },
            false,
            "httpd/unix-directory",
            true);
    };

    OCA.Onlyoffice.onRequestInsertImage = function (imageMimes) {
        OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Insert image"),
            $("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.editorInsertImage,
            false,
            imageMimes,
            true);
    };

    OCA.Onlyoffice.onRequestMailMergeRecipients = function (recipientMimes) {
        OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Select recipients"),
            $("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.editorSetRecipient,
            false,
            recipientMimes,
            true);
    };

    OCA.Onlyoffice.onRequestCompareFile = function (revisedMimes) {
        OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Select file to compare"),
            $("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.editorSetRevised,
            false,
            revisedMimes,
            true);
    };

    OCA.Onlyoffice.onDocumentReady = function (documentType) {
        if (documentType === "word") {
            OCA.Onlyoffice.bindVersionClick();
        } else {
            OCA.Onlyoffice.unbindVersionClick();
        }
    };

    OCA.Onlyoffice.changeFavicon = function (favicon) {
        $('link[rel="icon"]').attr("href", favicon);
    };

    OCA.Onlyoffice.onShowMessage = function (messageObj) {
        OC.Notification.show(messageObj.message, messageObj.props);
    }

    window.addEventListener("message", function (event) {
        if ($("#onlyofficeFrame")[0].contentWindow !== event.source
            || !event.data["method"]) {
            return;
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
            case "editorRequestCompareFile":
                OCA.Onlyoffice.onRequestCompareFile(event.data.param);
                break;
            case "onDocumentReady":
                OCA.Onlyoffice.onDocumentReady(event.data.param);
                break;
            case "changeFavicon":
                OCA.Onlyoffice.changeFavicon(event.data.param);
                break;
            case "onShowMessage":
                OCA.Onlyoffice.onShowMessage(event.data.param);
        }
    }, false);

    window.addEventListener("popstate", function (event) {
        if ($("#onlyofficeFrame").length
            && location.href.indexOf(OCA.Onlyoffice.AppName) == -1) {
            OCA.Onlyoffice.onRequestClose();
        }
    });

    window.addEventListener("DOMNodeRemoved", function(event) {
        if ($(event.target).length && $("#onlyofficeFrame").length
            && ($(event.target)[0].id === "viewer" || $(event.target)[0].id === $("#onlyofficeFrame")[0].id)) {
            OCA.Onlyoffice.changeFavicon($("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.faviconBase);
        }
    });

})(OCA);
