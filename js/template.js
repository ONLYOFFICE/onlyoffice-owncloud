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

    OCA.Onlyoffice.OpenTemplatePicker = function (name, extension, callback) {
        OCA.Onlyoffice.GetTemplates((templates, error) => {
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

    OCA.Onlyoffice.GetTemplates = function (callback) {
        $.get(OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/template"),
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

    OCA.Onlyoffice.AttachTemplates = function (dialog, templates) {
        var emptyItem = dialog[0].querySelector(".template-item");

        templates.forEach(template => {
            var item = emptyItem.cloneNode(true);
            item.className = "template-item";
            item.querySelector("img").src = "/core/img/filetypes/x-office-" + template["type"] + ".svg";
            item.querySelector("p").textContent = template["name"]
            item.onclick = function() {
                dialog[0].dataset.templateId = template["id"];
            }
            dialog[0].querySelector(".template-container").appendChild(item)
        });

        emptyItem.querySelector("img").src = "/core/img/filetypes/x-office-document.svg";
        emptyItem.querySelector("p").textContent = t("onlyoffice", "Empty");
        emptyItem.onclick = function() {
            dialog[0].dataset.templateId = "0";
        }
    }

})(jQuery, OC);
