/**
 *
 * (c) Copyright Ascensio System SIA 2020
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

    OCA.Onlyoffice = _.extend({
        AppName: "onlyoffice"
    }, OCA.Onlyoffice);

    OCA.Onlyoffice.OpenTemplatePicker = function (name, extension, type, callback) {
        OCA.Onlyoffice.GetTemplates(type, (templates, error) => {
            if (error || templates.length < 1) {
                callback(false);
            }

            $("#template-picker").remove();

            $.get(OC.filePath(OCA.Onlyoffice.AppName, "templates", "templatePicker.html"), 
                function (tmpl) {
                    var $tmpl = $(tmpl)
                    var dialog = $tmpl.octemplate({
                        dialog_name: "template-picker",
                        dialog_title: t("onlyoffice", "Select template")
                    });

                    OCA.Onlyoffice.AttachTemplates(dialog, templates);

                    $("body").append(dialog)

                    $("#template-picker").ocdialog({
                        closeOnEscape: true,
                        modal: true,
                        buttons: [{
                            text: t("core", "Cancel"),
                            classes: "cancel",
                            click: function() {
                                $(this).ocdialog("close")
                            }
                        }, {
                            text: t("onlyoffice", "Create"),
                            classes: "primary",
                            click: function() {
                                var templateId = this.dataset.templateId;
                                var fileList = OCA.Files.App.fileList;
                                OCA.Onlyoffice.CreateFile(name + extension, fileList, templateId);
                                $(this).ocdialog("close")
                            }
                        }]
                    });
                });

            callback(true);
        });
    };

    OCA.Onlyoffice.GetTemplates = function (type, callback) {
        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/template?type={type}", {
            type: type
        }),
            function onSuccess(response) {
                if (response.error) {
                    OC.Notification.show(response.error, {
                        type: "error",
                        timeout: 3
                    });
                    callback(null, response.error);
                    return;
                }
                callback(response, null);
                return;
            });
    };

    OCA.Onlyoffice.AddTemplate = function (file, callback) {
        var data = new FormData();
        data.append("file", file);

        $.ajax({
            method: "POST",
            url: OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/template"),
            data: data,
            processData: false,
            contentType: false,
            success: function onSuccess(response) {
                if (response.error) {
                    callback(null, response.error)
                    return;
                }
                callback(response, null);
            }
        });
    }

    OCA.Onlyoffice.AttachTemplates = function (dialog, templates) {
        var emptyItem = dialog[0].querySelector(".template-item");
        var type = templates[0]["type"];

        templates.forEach(template => {
            var item = emptyItem.cloneNode(true);

            $(item.querySelector("label")).attr("for", "template_picker-" + template["id"]);
            item.querySelector("input").id = "template_picker-" + template["id"];
            item.querySelector("img").src = "/core/img/filetypes/x-office-" + template["type"] + ".svg";
            item.querySelector("p").textContent = template["name"];
            item.onclick = function() {
                dialog[0].dataset.templateId = template["id"];
            }
            dialog[0].querySelector(".template-container").appendChild(item);
        });

        $(emptyItem.querySelector("label")).attr("for", "template_picker-0");
        emptyItem.querySelector("input").id = "template_picker-0";
        emptyItem.querySelector("img").src = "/core/img/filetypes/x-office-" + type + ".svg";
        emptyItem.querySelector("p").textContent = t("onlyoffice", "Empty");
        emptyItem.onclick = function() {
            dialog[0].dataset.templateId = "0";
        }
    }

    OCA.Onlyoffice.AttachItemTemplate = function (template) {
        var item = document.createElement("div");
        var itemThumb = document.createElement("div");
        var itemName = document.createElement("div");

        $(item).attr("data-id", template.id);
        $(item).addClass("template-item");
        $(itemThumb).addClass("thumbnail-template");
        $(itemThumb).append("<img src=/core/img/filetypes/x-office-" + template.type + ".svg />");
        $(itemName).addClass("template-name");
        $(itemName).append("<p>" + template.name + "</p>");

        $(".template-container").append($(item).prepend(itemThumb, itemName));
    }

})(jQuery, OC);
