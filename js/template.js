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
        const $tmpl = $(tmpl);
        const dialog = $tmpl.octemplate({
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
              click() {
                $(this).ocdialog("close");
              },
            },
            {
              text: t(OCA.Onlyoffice.AppName, "Create"),
              classes: "primary",
              click() {
                const templateId = this.dataset.templateId;
                const fileList = OCA.Files.App.fileList;
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
    const data = new FormData();
    data.append("file", file);

    $.ajax({
      method: "POST",
      url: OC.generateUrl("apps/" + OCA.Onlyoffice.AppName + "/ajax/template"),
      data,
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
          templateId,
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
    const emptyItem = dialog[0].querySelector(".onlyoffice-template-item");

    OCA.Onlyoffice.templates.forEach((template) => {
      if (template.type !== type) {
        return;
      }
      const item = emptyItem.cloneNode(true);
      OCA.Onlyoffice.FillItemTemplate(dialog, item, template);
      dialog[0]
        .querySelector(".onlyoffice-template-container")
        .appendChild(item);
    });

    OCA.Onlyoffice.FillItemTemplate(dialog, emptyItem, {
      id: 0,
      name: t(OCA.Onlyoffice.AppName, "Empty"),
      type,
    });

    $(emptyItem).addClass("selected");
  };

  OCA.Onlyoffice.AttachItemTemplate = function (template) {
    $.get(
      OC.filePath(OCA.Onlyoffice.AppName, "templates", "templateItem.html"),
      function (item) {
        item = $(item);

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
    const isExist = OCA.Onlyoffice.templates.some((template) => {
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
