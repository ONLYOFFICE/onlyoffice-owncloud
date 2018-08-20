/**
 *
 * (c) Copyright Ascensio System Limited 2010-2018
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

(function ($, OC) {

    $(document).ready(function () {
        OCA.Onlyoffice = _.extend({}, OCA.Onlyoffice);
        if (!OCA.Onlyoffice.AppName) {
            OCA.Onlyoffice = {
                AppName: "onlyoffice"
            };
        }

        var advToogle = function () {
            $("#onlyofficeSecretPanel, #onlyofficeSaveBreak").toggleClass("onlyoffice-hide");
        };

        // This script is loaded on all settings pages, but the elements are only rendered
        // on the OnlyOffice admin page, therefore there's nothing to do when the expected
        // elements don't exist.
        if ($("#onlyofficeInternalUrl").length === 0) {
            console.info('Cannot start OnlyOffice settings script');
            return;
        }

        if ($("#onlyofficeInternalUrl").val().length
            || $("#onlyofficeSecret").val().length
            || $("#onlyofficeStorageUrl").val().length) {
            advToogle();
        }

        $("#onlyofficeAdv").click(function () {
            advToogle();
        });

        $("#onlyofficeSave").click(function () {
            $(".section-onlyoffice").addClass("icon-loading");
            var onlyofficeUrl = $("#onlyofficeUrl").val().trim();

            if (!onlyofficeUrl.length) {
                $("#onlyofficeInternalUrl, #onlyofficeStorageUrl, #onlyofficeSecret").val("");
            }

            var onlyofficeInternalUrl = ($("#onlyofficeInternalUrl:visible").val() || "").trim();
            var onlyofficeStorageUrl = ($("#onlyofficeStorageUrl:visible").val() || "").trim();
            var onlyofficeSecret = $("#onlyofficeSecret:visible").val() || "";

            var defFormats = {};
            $("input[id^=\"onlyofficeDefFormat\"]").each(function() {
                defFormats[this.name] = this.checked;
            });

            var sameTab = $("#onlyofficeSameTab").is(":checked");

            $.ajax({
                method: "PUT",
                url: OC.generateUrl("apps/onlyoffice/ajax/settings"),
                data: {
                    documentserver: onlyofficeUrl,
                    documentserverInternal: onlyofficeInternalUrl,
                    storageUrl: onlyofficeStorageUrl,
                    secret: onlyofficeSecret,
                    defFormats: defFormats,
                    sameTab: sameTab
                },
                success: function onSuccess(response) {
                    $(".section-onlyoffice").removeClass("icon-loading");
                    if (response && response.documentserver != null) {
                        $("#onlyofficeUrl").val(response.documentserver);
                        $("#onlyofficeInternalUrl").val(response.documentserverInternal);
                        $("#onlyofficeStorageUrl").val(response.storageUrl);
                        $("#onlyofficeSecret").val(response.secret);

                        var message =
                            response.error
                                ? (t(OCA.Onlyoffice.AppName, "Error when trying to connect") + " (" + response.error + ")")
                                : t(OCA.Onlyoffice.AppName, "Settings have been successfully updated");
                        var row = OC.Notification.show(message);
                        setTimeout(function () {
                            OC.Notification.hide(row);
                        }, 3000);
                    }
                }
            });
        });

        $(".section-onlyoffice input").keypress(function (e) {
            var code = e.keyCode || e.which;
            if (code === 13) {
                $("#onlyofficeSave").click();
            }
        });
    });

})(jQuery, OC);
