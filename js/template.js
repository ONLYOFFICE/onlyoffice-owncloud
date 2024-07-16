/**
 *
 * (c) Copyright Ascensio System SIA 2024
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
  OCA.Onlyoffice = _.extend(
    {
      AppName: "onlyoffice",
      templates: [],
    },
    OCA.Onlyoffice
  );

  OCA.Onlyoffice.OpenTemplatePicker = function (name, extension, type) {
    $("#onlyoffice-template-picker").remove();

    $.get(
      OC.filePath(OCA.Onlyoffice.AppName, "templates", "templatePicker.html"),
      function (tmpl) {
        var $tmpl = $(tmpl);
        var dialog = $tmpl.octemplate({
          dialog_name: "onlyoffice-template-picker",
          dialog_title: t(OCA.Onlyoffice.AppName, "Select template"),
        });

        OCA.Onlyoffice.AttachTemplates(dialog, type);

        $("body").append(dialog);

        $("#onlyoffice-template-picker").ocdialog({
          closeOnEscape: true,
          modal: true,
          buttons: [
            {
              text: t("core", "Cancel"),
              classes: "cancel",
              click: function () {
                $(this).ocdialog("close");
              },
            },
            {
              text: t(OCA.Onlyoffice.AppName, "Create"),
              classes: "primary",
              click: function () {
                var templateId = this.dataset.templateId;
                var fileList = OCA.Files.App.fileList;
                OCA.Onlyoffice.CreateFile(
                  name + extension,
                  fileList,
                  templateId
                );
                $(this).ocdialog("close");
              },
            },
          ],
        });
      }
    );
  };

  OCA.Onlyoffice.GetTemplates = function (callback) {
    $.get(
      OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/template"),
      function onSuccess(response) {
        if (response.error) {
          OC.Notification.show(response.error, {
            type: "error",
            timeout: 3,
          });
          callback(null, response.error);
          return;
        }
        callback(response, null);
        return;
      }
    );
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
          callback(null, response.error);
          return;
        }
        callback(response, null);
      },
    });
  };

  OCA.Onlyoffice.DeleteTemplate = function (templateId, callback) {
    $.ajax({
      method: "DELETE",
      url: OC.generateUrl(
        "apps/" +
          OCA.Onlyoffice.AppName +
          "/ajax/template?templateId={templateId}",
        {
          templateId: templateId,
        }
      ),
      success: function onSuccess(response) {
        if (response) {
          callback(response);
        }
      },
    });
  };

  OCA.Onlyoffice.AttachTemplates = function (dialog, type) {
    var emptyItem = dialog[0].querySelector(".onlyoffice-template-item");

    OCA.Onlyoffice.templates.forEach((template) => {
      if (template.type !== type) {
        return;
      }
      var item = emptyItem.cloneNode(true);
      OCA.Onlyoffice.FillItemTemplate(dialog, item, template);
      dialog[0]
        .querySelector(".onlyoffice-template-container")
        .appendChild(item);
    });

    OCA.Onlyoffice.FillItemTemplate(dialog, emptyItem, {
      id: 0,
      name: t(OCA.Onlyoffice.AppName, "Empty"),
      type: type,
    });

    $(emptyItem).addClass("selected");
  };

  OCA.Onlyoffice.AttachItemTemplate = function (template) {
    $.get(
      OC.filePath(OCA.Onlyoffice.AppName, "templates", "templateItem.html"),
      function (item) {
        var item = $(item);

        item.attr("data-id", template.id);
        item
          .children("img")
          .attr(
            "src",
            "/core/img/filetypes/x-office-" + template.type + ".svg"
          );
        item.children("p").text(template.name);

        $(".onlyoffice-template-container").append(item);
      }
    );
  };

  OCA.Onlyoffice.FillItemTemplate = function (dialog, item, template) {
    $(item.querySelector("label")).attr(
      "for",
      "template_picker-" + template.id
    );
    item.querySelector("img").src =
      "/core/img/filetypes/x-office-" + template.type + ".svg";
    item.querySelector("p").textContent = template.name;
    item.onclick = function () {
      $(".onlyoffice-template-item").removeClass("selected");
      $(item).addClass("selected");
      dialog[0].dataset.templateId = template.id;
    };
  };

  OCA.Onlyoffice.TemplateExist = function (type) {
    var isExist = OCA.Onlyoffice.templates.some((template) => {
      return template.type === type;
    });

    return isExist;
  };

  $(document).ready(function () {
    OCA.Onlyoffice.GetTemplates((templates, error) => {
      if (error || !Array.isArray(templates) || templates.length < 1) {
        return;
      }

      OCA.Onlyoffice.templates = templates;
    });
  });
})(jQuery, OC);
