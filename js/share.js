/**
 *
 * (c) Copyright Ascensio System SIA 2019
 *
 * This program is a free software product.
 * You can redistribute it and/or modify it under the terms of the GNU Affero General Public License
 * (AGPL) version 3 as published by the Free Software Foundation.
 * In accordance with Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * For details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 17-2 Elijas street, Riga, Latvia, EU, LV-1021.
 *
 * The interactive user interfaces in modified source and object code versions of the Program
 * must display Appropriate Legal Notices, as required under Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product logo when distributing the program.
 * Pursuant to Section 7(e) we decline to grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as well as technical
 * writing content are licensed under the terms of the Creative Commons Attribution-ShareAlike 4.0 International.
 * See the License terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

(function (OCA) {

    OCA.Onlyoffice = _.extend({
            AppName: "onlyoffice"
        }, OCA.Onlyoffice);

    OCA.Onlyoffice.ShareItemModel = {
        attach: function (model) {
            if (_.isUndefined(model) || !model.getRegisteredShareAttribute) {
                return;
            }
            var fileName = model.getFileInfo().attributes.name;

            var extension = OCA.Onlyoffice.GetFileExtension(fileName);

            var formats = OCA.Onlyoffice.setting.formats;

            var config = formats[extension];
            if (!config) {
                return;
            }

            var addDownload = model.getRegisteredShareAttribute("permissions", "download") === null;

            if (addDownload) {
                model.registerShareAttribute({
                    "scope": "permissions",
                    "key": "download",
                    "default": true,
                    "label": t(OCA.Onlyoffice.AppName, "download"),
                    "incompatiblePermissions": [OC.PERMISSION_UPDATE]
                });
            }

            if (config.review) {
                model.registerShareAttribute({
                    "scope": OCA.Onlyoffice.AppName,
                    "key": "review",
                    "default": false,
                    "label": t(OCA.Onlyoffice.AppName, "review"),
                    "incompatiblePermissions": [OC.PERMISSION_UPDATE],
                });
            }

            if (config.fillForms) {
                model.registerShareAttribute({
                    "scope": OCA.Onlyoffice.AppName,
                    "key": "fillForms",
                    "default": false,
                    "label": t(OCA.Onlyoffice.AppName, "form filling"),
                    "incompatiblePermissions": [OC.PERMISSION_UPDATE],
                    "incompatibleAttributes": [
                        {
                            "scope": OCA.Onlyoffice.AppName,
                            "key": "review",
                            "enabled": true
                        }
                    ]
                });
            }

            if (config.comment) {
                model.registerShareAttribute({
                    "scope": OCA.Onlyoffice.AppName,
                    "key": "comment",
                    "default": false,
                    "label": t(OCA.Onlyoffice.AppName, "comment"),
                    "incompatiblePermissions": [OC.PERMISSION_UPDATE],
                    "incompatibleAttributes": [
                        {
                            "scope": OCA.Onlyoffice.AppName,
                            "key": "review",
                            "enabled": true
                        },
                        {
                            "scope": OCA.Onlyoffice.AppName,
                            "key": "fillForms",
                            "enabled": true
                        }
                    ]
                });
            }

            if (config.modifyFilter) {
                model.registerShareAttribute({
                    "scope": OCA.Onlyoffice.AppName,
                    "key": "modifyFilter",
                    "default": true,
                    "label": t(OCA.Onlyoffice.AppName, "modify filter"),
                    "requiredPermissions": [OC.PERMISSION_UPDATE],
                    "incompatibleAttributes": [
                        {
                            "scope": OCA.Onlyoffice.AppName,
                            "key": "commentOnly",
                            "enabled": true
                        }
                    ]
                });
            }
        }
    };

    OCA.Onlyoffice.Share = function () {
        OC.Plugins.register("OC.Share.ShareItemModel", OCA.Onlyoffice.ShareItemModel);
    };

})(OCA);
