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

(function ($, OCA) {

    OCA.Onlyoffice = _.extend({
            AppName: "onlyoffice",
            inframe: false,
            fileId: null,
            shareToken: null,
            insertImageType: null
        }, OCA.Onlyoffice);

    OCA.Onlyoffice.InitEditor = function () {

        OCA.Onlyoffice.fileId = $("#iframeEditor").data("id");
        var filePath = $("#iframeEditor").data("path");
        OCA.Onlyoffice.shareToken = $("#iframeEditor").data("sharetoken");
        OCA.Onlyoffice.version = $("#iframeEditor").data("version");
        OCA.Onlyoffice.template = $("#iframeEditor").data("template");
        OCA.Onlyoffice.inframe = !!$("#iframeEditor").data("inframe");
        OCA.Onlyoffice.anchor = $("#iframeEditor").attr("data-anchor");

        if (OCA.Onlyoffice.inframe) {
            OCA.Onlyoffice.faviconBase = $('link[rel="icon"]').attr("href");
        }

        if (!OCA.Onlyoffice.fileId && !OCA.Onlyoffice.shareToken) {
            OCA.Onlyoffice.showMessage(t(OCA.Onlyoffice.AppName, "FileId is empty"), {type: "error"});
            return;
        }

        if (typeof DocsAPI === "undefined") {
            OCA.Onlyoffice.showMessage(t(OCA.Onlyoffice.AppName, "ONLYOFFICE cannot be reached. Please contact admin"), {type: "error"});
            return;
        }

        var configUrl = OC.linkToOCS("apps/" + OCA.Onlyoffice.AppName + "/api/v1/config", 2) + (OCA.Onlyoffice.fileId || 0);

        var params = [];
        if (filePath) {
            params.push("filePath=" + encodeURIComponent(filePath));
        }
        if (OCA.Onlyoffice.shareToken) {
            params.push("shareToken=" + encodeURIComponent(OCA.Onlyoffice.shareToken));
        }
        if (OCA.Onlyoffice.version > 0) {
            params.push("version=" + OCA.Onlyoffice.version);
        }
        if (OCA.Onlyoffice.template) {
            params.push("template=true");
        }

        if (OCA.Onlyoffice.inframe) {
            params.push("inframe=true");
        }

        if (OCA.Onlyoffice.anchor) {
            params.push("anchor=" + encodeURIComponent(OCA.Onlyoffice.anchor));
        }

        if (OCA.Onlyoffice.Desktop) {
            params.push("desktop=true");
        }
        if (params.length) {
            configUrl += "?" + params.join("&");
        }

        $.ajax({
            url: configUrl,
            success: function onSuccess(config) {
                if (config) {
                    if (config.error != null) {
                        OCA.Onlyoffice.showMessage(config.error, {type: "error"});
                        return;
                    }

                    var docIsChanged = null;
                    var docIsChangedTimeout = null;

                    var setPageTitle = function (event) {
                        clearTimeout(docIsChangedTimeout);

                        if (docIsChanged !== event.data) {
                            var titleChange = function () {
                                window.document.title = config.document.title + (event.data ? " *" : "") + " - " + oc_defaults.title;
                                docIsChanged = event.data;
                            };

                            if (event === false || event.data) {
                                titleChange();
                            } else {
                                docIsChangedTimeout = setTimeout(titleChange, 500);
                            }
                        }
                    };
                    setPageTitle(false);

                    OCA.Onlyoffice.documentType = config.documentType;

                    config.events = {
                        "onDocumentStateChange": setPageTitle,
                        "onDocumentReady": OCA.Onlyoffice.onDocumentReady,
                        "onMakeActionLink": OCA.Onlyoffice.onMakeActionLink,
                    };

                    if (config.editorConfig.tenant) {
                        config.events.onAppReady = function () {
                            OCA.Onlyoffice.docEditor.showMessage(t(OCA.Onlyoffice.AppName, "You are using public demo ONLYOFFICE Docs server. Please do not store private sensitive data."));
                        };
                    }

                    if (OCA.Onlyoffice.inframe && !OCA.Onlyoffice.shareToken
                        || OC.currentUser) {
                        config.events.onRequestSaveAs = OCA.Onlyoffice.onRequestSaveAs;
                        config.events.onRequestInsertImage = OCA.Onlyoffice.onRequestInsertImage;
                        config.events.onRequestMailMergeRecipients = OCA.Onlyoffice.onRequestMailMergeRecipients;
                        config.events.onRequestCompareFile = OCA.Onlyoffice.onRequestCompareFile;
                        config.events.onRequestUsers = OCA.Onlyoffice.onRequestUsers;
                        config.events.onRequestSendNotify = OCA.Onlyoffice.onRequestSendNotify;
                        config.events.onMetaChange = OCA.Onlyoffice.onMetaChange;

                        if (!OCA.Onlyoffice.filePath) {
                            OCA.Onlyoffice.filePath = config._file_path;
                        }

                        if (!OCA.Onlyoffice.template) {
                            config.events.onRequestHistory = OCA.Onlyoffice.onRequestHistory;
                            config.events.onRequestHistoryData = OCA.Onlyoffice.onRequestHistoryData;
                            config.events.onRequestRestore = OCA.Onlyoffice.onRequestRestore;

                            if (!OCA.Onlyoffice.version) {
                                config.events.onRequestHistoryClose = OCA.Onlyoffice.onRequestHistoryClose;
                            }
                        }
                    }

                    if (OCA.Onlyoffice.inframe) {
                        config.events.onRequestClose = OCA.Onlyoffice.onRequestClose;
                    }

                    if (OCA.Onlyoffice.inframe
                        && config._files_sharing && !OCA.Onlyoffice.shareToken
                        && window.parent.OCA.Onlyoffice.context) {
                        config.events.onRequestSharingSettings = OCA.Onlyoffice.onRequestSharingSettings;
                    }

                    OCA.Onlyoffice.docEditor = new DocsAPI.DocEditor("iframeEditor", config);

                    if (config.type === "mobile" && $("#app > iframe").css("position") === "fixed") {
                        $("#app > iframe").css("height", "calc(100% - 45px)");
                    }

                    var favicon = OC.filePath(OCA.Onlyoffice.AppName, "img", OCA.Onlyoffice.documentType + ".ico");
                    if (OCA.Onlyoffice.inframe) {
                        window.parent.postMessage({
                            method: "changeFavicon",
                            param: favicon
                        },
                        "*");
                    } else {
                        $('link[rel="icon"]').attr("href", favicon);
                    }
                }
            }
        });
    };

    OCA.Onlyoffice.onRequestHistory = function (version) {
        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/history?fileId={fileId}&shareToken={shareToken}",
            {
                fileId: OCA.Onlyoffice.fileId || 0,
                shareToken: OCA.Onlyoffice.shareToken || "",
            }),
            function onSuccess(response) {
                OCA.Onlyoffice.refreshHistory(response, version);
        });
    };

    OCA.Onlyoffice.onRequestHistoryData = function (event) {
        var version = event.data; 

        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/version?fileId={fileId}&version={version}&shareToken={shareToken}",
            {
                fileId: OCA.Onlyoffice.fileId || 0,
                version: version,
                shareToken: OCA.Onlyoffice.shareToken || "",
            }),
            function onSuccess(response) {
                if (response.error) {
                    response = {
                        error: response.error,
                        version: version,
                    };
                }
                OCA.Onlyoffice.docEditor.setHistoryData(response);
        });
    };

    OCA.Onlyoffice.onRequestRestore = function (event) {
        var version = event.data.version;

        $.ajax({
            method: "PUT",
            url: OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/restore"),
            data: {
                fileId: OCA.Onlyoffice.fileId || 0,
                version: version,
                shareToken: OCA.Onlyoffice.shareToken || "",
            },
            success: function onSuccess(response) {
                OCA.Onlyoffice.refreshHistory(response, version);

                if (OCA.Onlyoffice.inframe) {
                    window.parent.postMessage({
                        method: "onRefreshVersionsDialog"
                    },
                    "*");
                }
            }
        })
    };

    OCA.Onlyoffice.onRequestHistoryClose = function () {
        location.reload(true);
    };

    OCA.Onlyoffice.onDocumentReady = function() {
        if (OCA.Onlyoffice.inframe) {
            window.parent.postMessage({
                method: "onDocumentReady",
                param: OCA.Onlyoffice.documentType
            },
            "*");
        }

        if (OCA.Onlyoffice.version > 0) {
            OCA.Onlyoffice.onRequestHistory(OCA.Onlyoffice.version);
        }
    };

    OCA.Onlyoffice.onRequestSaveAs = function (event) {
        var saveData = {
            name: event.data.title,
            url: event.data.url
        };

        if (OCA.Onlyoffice.inframe) {
            window.parent.postMessage({
                method: "editorRequestSaveAs",
                param: saveData
            },
            "*");
        } else {
            OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Save as"),
                function (fileDir) {
                    saveData.dir = fileDir;
                    OCA.Onlyoffice.editorSaveAs(saveData);
                },
                false,
                "httpd/unix-directory",
                true);
        }
    };

    OCA.Onlyoffice.editorSaveAs = function (saveData) {
        $.post(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/save"),
            saveData,
            function onSuccess(response) {
                if (response.error) {
                    OCA.Onlyoffice.showMessage(response.error, {
                        type: "error",
                        timeout: 3
                    });
                    return;
                }

                OCA.Onlyoffice.showMessage(t(OCA.Onlyoffice.AppName, "File saved") + " (" + response.name + ")", {
                    timeout: 3
                });
            });
    };

    OCA.Onlyoffice.onRequestInsertImage = function (event) {
        var imageMimes = [
            "image/bmp", "image/x-bmp", "image/x-bitmap", "application/bmp",
            "image/gif",
            "image/jpeg", "image/jpg", "application/jpg", "application/x-jpg",
            "image/png", "image/x-png", "application/png", "application/x-png"
        ];

        if (event.data) {
            OCA.Onlyoffice.insertImageType = event.data.c;
        }

        if (OCA.Onlyoffice.inframe) {
            window.parent.postMessage({
                method: "editorRequestInsertImage",
                param: imageMimes
            },
            "*");
        } else {
            OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Insert image"),
                OCA.Onlyoffice.editorInsertImage,
                false,
                imageMimes,
                true);
        }
    };

    OCA.Onlyoffice.editorInsertImage = function (filePath) {
        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/url?filePath={filePath}",
            {
                filePath: filePath
            }),
            function onSuccess(response) {
                if (response.error) {
                    OCA.Onlyoffice.showMessage(response.error, {
                        type: "error",
                        timeout: 3
                    });
                    return;
                }

                if (OCA.Onlyoffice.insertImageType) {
                    response.c = OCA.Onlyoffice.insertImageType;
                }

                OCA.Onlyoffice.docEditor.insertImage(response);
            });
    };

    OCA.Onlyoffice.onRequestMailMergeRecipients = function () {
        var recipientMimes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ];

        if (OCA.Onlyoffice.inframe) {
            window.parent.postMessage({
                method: "editorRequestMailMergeRecipients",
                param: recipientMimes
            },
            "*");
        } else {
            OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Select recipients"),
                OCA.Onlyoffice.editorSetRecipient,
                false,
                recipientMimes,
                true);
        }
    };

    OCA.Onlyoffice.editorSetRecipient = function (filePath) {
        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/url?filePath={filePath}",
            {
                filePath: filePath
            }),
            function onSuccess(response) {
                if (response.error) {
                    OCA.Onlyoffice.showMessage(response.error, {
                        type: "error",
                        timeout: 3
                    });
                    return;
                }

                OCA.Onlyoffice.docEditor.setMailMergeRecipients(response);
            });
    };

    OCA.Onlyoffice.onRequestClose = function () {
        OCA.Onlyoffice.docEditor.destroyEditor();

        window.parent.postMessage({
            method: "editorRequestClose"
        },
        "*");
    };

    OCA.Onlyoffice.onRequestSharingSettings = function () {
        window.parent.postMessage({
            method: "editorRequestSharingSettings"
        },
        "*");
    };

    OCA.Onlyoffice.onRequestCompareFile = function () {
        var revisedMimes = [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        if (OCA.Onlyoffice.inframe) {
            window.parent.postMessage({
                method: "editorRequestCompareFile",
                param: revisedMimes
            },
            "*");
        } else {
            OC.dialogs.filepicker(t(OCA.Onlyoffice.AppName, "Select file to compare"),
                OCA.Onlyoffice.editorSetRevised,
                false,
                revisedMimes,
                true);
        }
    };

    OCA.Onlyoffice.editorSetRevised = function (filePath) {
        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/url?filePath={filePath}",
            {
                filePath: filePath
            }),
            function onSuccess(response) {
                if (response.error) {
                    OCA.Onlyoffice.showMessage(response.error, {
                        type: "error",
                        timeout: 3
                    });
                    return;
                }

                OCA.Onlyoffice.docEditor.setRevisedFile(response);
            });
    };

    OCA.Onlyoffice.onMakeActionLink = function (event) {
        var url = location.href;
        if (event && event.data) {
            var indexAnchor = url.indexOf("#");
            if (indexAnchor != -1) {
                url = url.substring(0, indexAnchor);
            }

            var data = JSON.stringify(event.data);
            data = "anchor=" + encodeURIComponent(data);

            var inframeRegex = /inframe=([^&]*&?)/g;
            if (inframeRegex.test(url)) {
                url = url.replace(inframeRegex, data);
            }

            var anchorRegex = /anchor=([^&]*)/g;
            if (anchorRegex.test(url)) {
                url = url.replace(anchorRegex, data);
            } else {
                url += (url.indexOf("?") == -1) ? "?" : "&";
                url += data;
            }
        }

        OCA.Onlyoffice.docEditor.setActionLink(url);
    };

    OCA.Onlyoffice.onRequestUsers = function (event) {
        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/users?fileId={fileId}", 
        {
            fileId: OCA.Onlyoffice.fileId || 0
        }),
        function onSuccess(response) {
            OCA.Onlyoffice.docEditor.setUsers({
                "users": response
            });
        });
    };

    OCA.Onlyoffice.onRequestSendNotify = function (event) {
        var actionLink = event.data.actionLink;
        var comment = event.data.message;
        var emails = event.data.emails;

        var fileId = OCA.Onlyoffice.fileId;

        $.post(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/mention"),
            {
                fileId: fileId,
                anchor: JSON.stringify(actionLink),
                comment: comment,
                emails: emails
            },
            function onSuccess(response) {
                if (response.error) {
                    OCA.Onlyoffice.showMessage(response.error, {
                        type: "error",
                        timeout: 3
                    });
                    return;
                }

                OCA.Onlyoffice.showMessage(response.message, {
                    timeout: 3
                });
            });
    };

    OCA.Onlyoffice.onMetaChange = function (event) {
        if (event.data.favorite !== undefined) {
            $.ajax({
                url: OC.generateUrl("apps/files/api/v1/files" + OC.encodePath(OCA.Onlyoffice.filePath)),
                type: "post",
                data: JSON.stringify({
                    tags: event.data.favorite ? [OC.TAG_FAVORITE] : []
                }),
                contentType: "application/json",
                dataType: "json",
                success: function(){
                    OCA.Onlyoffice.docEditor.setFavorite(event.data.favorite);
                }
            });
        }
    }

    OCA.Onlyoffice.showMessage = function (message, props = null) {
        if (OCA.Onlyoffice.inframe) {
            window.parent.postMessage({
                method: "onShowMessage",
                param: {
                    message: message,
                    props: props
                }
            },
            "*");
            return;
        }

        OC.Notification.show(message, props);
    };

    OCA.Onlyoffice.refreshHistory = function (response, version) {
        if (response.error) {
            var data = {error: response.error};
        } else {
            var currentVersion = 0;
            $.each(response, function (i, fileVersion) {
                if (fileVersion.version >= currentVersion) {
                    currentVersion = fileVersion.version;
                }

                fileVersion.created = moment(fileVersion.created * 1000).format("L LTS");
                if (fileVersion.changes) {
                    $.each(fileVersion.changes, function (j, change) {
                        change.created = moment(change.created + "+00:00").format("L LTS");
                    });
                }
            });

            if (version) {
                currentVersion = Math.min(currentVersion, version);
            }

            data = {
                currentVersion: currentVersion,
                history: response,
            };
        }
        OCA.Onlyoffice.docEditor.refreshHistory(data);
    }

    $(document).ready(OCA.Onlyoffice.InitEditor);

})(jQuery, OCA);
