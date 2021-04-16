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
            "httpd/unix-directory");
    };

    OCA.Onlyoffice.onRequestInsertImage = function (imageMimes) {
        OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Insert image"),
            $("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.editorInsertImage,
            false,
            imageMimes);
    };

    OCA.Onlyoffice.onRequestMailMergeRecipients = function (recipientMimes) {
        OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Select recipients"),
            $("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.editorSetRecipient,
            false,
            recipientMimes);
    };

    OCA.Onlyoffice.onRequestCompareFile = function (revisedMimes) {
        OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Select file to compare"),
            $("#onlyofficeFrame")[0].contentWindow.OCA.Onlyoffice.editorSetRevised,
            false,
            revisedMimes);
    };

    OCA.Onlyoffice.onDocumentReady = function (documentType) {
        if (documentType === "text") {
            OCA.Onlyoffice.bindVersionClick();
        } else {
            OCA.Onlyoffice.unbindVersionClick();
        }
    };

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
        }
    }, false);

})(OCA);
