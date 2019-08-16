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

    // v10.3
    OCA.Onlyoffice.ShareOptions = {

        /**
         * @type {OCA.Share.ShareItemModel}
         */
        model: null,

        config: null,

        _shareOptions: [
            {
                name: "onlyoffice-download",
                label: t(OCA.Onlyoffice.AppName, "download"),
                attribute: {
                    scope: "permissions",
                    key: "download"
                }
            },
            {
                name: "onlyoffice-review",
                label: t(OCA.Onlyoffice.AppName, "review"),
                attribute: {
                    scope: OCA.Onlyoffice.AppName,
                    key: "review"
                }
            },
            {
                name: "onlyoffice-fill-forms",
                label: t(OCA.Onlyoffice.AppName, "form filling"),
                attribute: {
                    scope: OCA.Onlyoffice.AppName,
                    key: "fillForms"
                }
            },
            {
                name: "onlyoffice-comment",
                label: t(OCA.Onlyoffice.AppName, "comment"),
                attribute: {
                    scope: OCA.Onlyoffice.AppName,
                    key: "comment"
                }
            },
            {
                name: "onlyoffice-modify-filter",
                label: t(OCA.Onlyoffice.AppName, "modify filter"),
                attribute: {
                    scope: OCA.Onlyoffice.AppName,
                    key: "modifyFilter"
                }
            }
        ],

        _shareOptionsTemplate: null,

        /**
         * Extend ShareItemModel.addShare with onlyoffice attributes
         *
         * @param properties
         */
        addShareProperties: function(properties) {
            var extendedProperties = properties;
            extendedProperties.attributes = properties.attributes || {};

            // get default permissions
            extendedProperties.permissions = this.model.getDefaultPermissions();

            // disable resharing as it is not supported currently
            extendedProperties.permissions = this._removePermission(
                extendedProperties.permissions, OC.PERMISSION_SHARE
            );

            // if resharing unset all attributes
            // as resharing is not compatible
            if (!_.isUndefined(this.model.getReshareOwner())) {
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, "permissions", "download", null
                );
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "review", null
                );
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "fillForms", null
                );
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "comment", null
                );
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "modifyFilter", null
                );

                return extendedProperties;
            }

            // if edit permission got enabled set only modify filter,
            // otherwise set review, fillForms, download, comment
            if (this._hasPermission(extendedProperties.permissions, OC.PERMISSION_UPDATE)
                || this._hasPermission(extendedProperties.permissions, OC.PERMISSION_CREATE)
                || this._hasPermission(extendedProperties.permissions, OC.PERMISSION_DELETE)) {
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, "permissions", "download", null
                );
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "review", null
                );
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "fillForms", null
                );
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "comment", null
                );
                if (this.config.modifyFilter) {
                    extendedProperties.attributes = this._updateAttributes(
                        extendedProperties.attributes, OCA.Onlyoffice.AppName, "modifyFilter", true
                    );
                }
            } else {
                if (this._getAttribute(extendedProperties.attributes, "permissions", "download") === null) {
                    extendedProperties.attributes = this._updateAttributes(
                        extendedProperties.attributes, "permissions", "download", true
                    );
                }
                if (this.config.review) {
                    extendedProperties.attributes = this._updateAttributes(
                        extendedProperties.attributes, OCA.Onlyoffice.AppName, "review", false
                    );
                }
                if (this.config.fillForms) {
                    extendedProperties.attributes = this._updateAttributes(
                        extendedProperties.attributes, OCA.Onlyoffice.AppName, "fillForms", false
                    );
                }
                if (this.config.comment) {
                    extendedProperties.attributes = this._updateAttributes(
                        extendedProperties.attributes, OCA.Onlyoffice.AppName, "comment", false
                    );
                }
                extendedProperties.attributes = this._updateAttributes(
                    extendedProperties.attributes, OCA.Onlyoffice.AppName, "modifyFilter", null
                );
            }

            return extendedProperties;
        },

        /**
         * Extend ShareItemModel.updateShare with onlyoffice attributes
         *
         * @param shareId
         * @param properties
         */
        updateShareProperties: function(shareId, properties) {
            var updatedProperties = properties;
            updatedProperties.attributes = properties.attributes || {};

            // if reshare permission got enabled or if resharing unset all attributes
            // as resharing is not compatible
            if (this._hasPermission(updatedProperties.permissions, OC.PERMISSION_SHARE)
                || !_.isUndefined(this.model.getReshareOwner())) {
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, "permissions", "download", null
                );
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "review", null
                );
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "fillForms", null
                );
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "comment", null
                );
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "modifyFilter", null
                );

                return updatedProperties;
            }

            // if edit permission got enabled, enable only modifyFilter
            if (this._hasPermission(updatedProperties.permissions, OC.PERMISSION_UPDATE)
                || this._hasPermission(updatedProperties.permissions, OC.PERMISSION_CREATE)
                || this._hasPermission(updatedProperties.permissions, OC.PERMISSION_DELETE)) {
                updatedProperties.attributes = properties.attributes || {};
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, "permissions", "download", null
                );
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "review", null
                );
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "fillForms", null
                );
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "comment", null
                );
                if (this.config.modifyFilter) {
                    updatedProperties.attributes = this._updateAttributes(
                        updatedProperties.attributes, OCA.Onlyoffice.AppName, "modifyFilter", true
                    );
                }

                return updatedProperties;
            }

            // edit and resharing is disabled,
            // if attributes not set then reset to default the attributes,
            // otherwise just update attributes
            if (this._getAttribute(updatedProperties.attributes, "permissions", "download") === null
                && this._getAttribute(updatedProperties.attributes, OCA.Onlyoffice.AppName, "review") === null
                && this._getAttribute(updatedProperties.attributes, OCA.Onlyoffice.AppName, "fillForms") === null
                && this._getAttribute(updatedProperties.attributes, OCA.Onlyoffice.AppName, "comment") === null
                ) {
                updatedProperties.attributes = properties.attributes || {};

                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, "permissions", "download", true
                );
                if (this.config.review) {
                    updatedProperties.attributes = this._updateAttributes(
                        updatedProperties.attributes, OCA.Onlyoffice.AppName, "review", false
                    );
                }
                if (this.config.fillForms) {
                    updatedProperties.attributes = this._updateAttributes(
                        updatedProperties.attributes, OCA.Onlyoffice.AppName, "fillForms", false
                    );
                }
                if (this.config.comment) {
                    updatedProperties.attributes = this._updateAttributes(
                        updatedProperties.attributes, OCA.Onlyoffice.AppName, "comment", false
                    );
                }
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, OCA.Onlyoffice.AppName, "modifyFilter", null
                );
            } else {
                updatedProperties.attributes = properties.attributes || {};
            }

            return updatedProperties;
        },

        /**
         * Click on custom checkbox handler. Adjust required app/core attributes and
         * permissions
         *
         * @param event
         */
        onOnlyOfficeOptionChange: function(event) {
            var share;
            var $element = $(event.target);
            var $li = $element.closest("li");
            var shareId = $li.data("share-id");

            var shares = this.model.getSharesWithCurrentItem();
            for (var shareIndex = 0; shareIndex < shares.length; shareIndex++) {
                if (shares[shareIndex].id === shareId) {
                    share = shares[shareIndex];
                    break;
                }
            }

            if (!share) {
                console.error("Share with id " + shareId + " not found");
                return;
            }

            // retrieve currently set checkboxes
            var attributes = this._getAttributesForShareOptions(share.attributes, shareId);

            var review = this._getAttribute(attributes, OCA.Onlyoffice.AppName, "review");
            var fillForms = this._getAttribute(attributes, OCA.Onlyoffice.AppName, "fillForms");
            var comment = this._getAttribute(attributes, OCA.Onlyoffice.AppName, "comment");

            // if review enabled, disable fillForms and comment
            if (review && review.enabled === true) {
                attributes = this._updateAttributes(
                    attributes, OCA.Onlyoffice.AppName, "fillForms", null
                );
                attributes = this._updateAttributes(
                    attributes, OCA.Onlyoffice.AppName, "comment", null
                );
            } else if (review && review.enabled === false) {
                if (fillForms === null && this.config.fillForms) {
                    attributes = this._updateAttributes(
                        attributes, OCA.Onlyoffice.AppName, "fillForms", false
                    );
                }
                if (comment === null && this.config.comment) {
                    attributes = this._updateAttributes(
                        attributes, OCA.Onlyoffice.AppName, "comment", false
                    );
                }
            }

            // if fillForms enabled, disable comment
            if (fillForms && fillForms.enabled === true) {
                attributes = this._updateAttributes(
                    attributes, OCA.Onlyoffice.AppName, "comment", null
                );
            } else if (fillForms && fillForms.enabled === false) {
                if (comment === null && this.config.comment) {
                    attributes = this._updateAttributes(
                        attributes, OCA.Onlyoffice.AppName, "comment", false
                    );
                }
            }

            // trigger updateShare which will call updateShare wrappers
            this.model.updateShare(
                shareId,
                {
                    permissions: share.permissions,
                    attributes: attributes
                },
                {}
            );
        },

        /**
         * Based on attributes set for the share, render proper share options
         *
         * @param view
         */
        render: function (view) {
            var shares = this.model.getSharesWithCurrentItem();
            for (var shareIndex = 0; shareIndex < shares.length; shareIndex++) {
                var share = shares[shareIndex];

                // get existing share element if already initialized
                var $share = view.$el.find("li[data-share-id=" + share.id + "]");
                if ($share) {
                    // extend with share options for the onlyoffice
                    var shareOptions = this._getShareOptionsForAttributes(
                        share.attributes
                    );

                    var shareOptionsData = [];
                    for (var optionIndex = 0; optionIndex < shareOptions.length; optionIndex++) {
                        var shareOption = shareOptions[optionIndex];

                        shareOptionsData.push({
                            cid: view.cid,
                            shareId: share.id,
                            shareWith: share.share_with,
                            name: shareOption.name,
                            label: shareOption.label,
                            checked: shareOption.checked
                        });
                    }

                    $share.append(
                        this._template({
                            shareOptions: shareOptionsData
                        })
                    );
                }
            }

            // On click trigger logic to update for new richdocuments attributes
            $(".onlyOfficeShareOption").on("click", $.proxy(this.onOnlyOfficeOptionChange, this));
        },

        /**
         * Get attributes for the currently rendered checkboxes
         *
         * @param attributes
         * @param shareId
         * @returns {Array}
         * @private
         */
        _getAttributesForShareOptions: function(attributes, shareId) {
            var that = this;

            var attributes = attributes || [];
            $("li[data-share-id='" + shareId + "'] .onlyOfficeShareOption").each(function(index, checkbox) {
                var shareOptionName = $(checkbox).attr("name");
                var shareOptionChecked = $(checkbox).is(":checked");

                for (var optionIndex = 0; optionIndex < that._shareOptions.length; optionIndex++) {
                    var shareOption = that._shareOptions[optionIndex];
                    if (shareOption.name === shareOptionName) {
                        attributes = that._updateAttributes(
                            attributes, shareOption.attribute.scope, shareOption.attribute.key, shareOptionChecked
                        );
                    }
                }
            });

            return attributes;
        },

        /**
         * Get template share options for given share attributes
         *
         * @param attributes
         * @returns {array}
         * @private
         */
        _getShareOptionsForAttributes: function(attributes) {
            var options = [];

            if (attributes) {

                // for each option, determine if share option is enabled based on required attributes
                for (var optionIndex = 0; optionIndex < this._shareOptions.length; optionIndex++) {
                    var shareOption = this._shareOptions[optionIndex];

                    var shareOptionAttribute = shareOption.attribute;

                    // determine if share option is enabled
                    // looping over required and current attributes
                    var enabled = null;
                    for (var attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
                        var currentAttribute = attributes[attrIndex];
                        if (currentAttribute.scope === shareOptionAttribute.scope
                            && currentAttribute.key === shareOptionAttribute.key) {
                            enabled = currentAttribute.enabled;
                        }
                    }

                    // set option
                    if (enabled !== null) {
                        options.push({
                            name: shareOption.name,
                            label: shareOption.label,
                            checked: enabled
                        });
                    }
                }
            }

            return options;
        },


        _getAttribute: function(attributes, scope, key) {
            for (var i in attributes) {
                if (attributes[i].scope === scope
                    && attributes[i].key === key
                    && attributes[i].enabled !== null) {
                    return attributes[i];
                }
            }

            return null;
        },

        _updateAttributes: function(attributes, scope, key, enabled) {
            var updatedAttributes = [];

            // copy existing scope-key pairs from attributes
            for (var i in attributes) {
                var attribute = attributes[i]
                if (attribute.scope !== scope
                    || attribute.key !== key) {
                    updatedAttributes.push({
                        scope: attribute.scope,
                        key: attribute.key,
                        enabled: attribute.enabled
                    });
                }
            }

            // update attributes with scope-key pair to update
            if (scope && key && enabled !== null) {
                updatedAttributes.push({
                    scope: scope,
                    key: key,
                    enabled: enabled
                });
            }

            return updatedAttributes;
        },

        _hasPermission: function(permissions, permission) {
            return (permissions & permission) === permission;
        },

        _removePermission: function(permissions, permission) {
            return (permissions & ~permission);
        },

        /**
         * Fill share options template based on supplied data map of {{ data-item }}
         * @private
         */
        _template: function (data) {
            if (!this._shareOptionsTemplate) {
                this._shareOptionsTemplate = Handlebars.compile(
                    '<div class="onlyOfficeShareOptions">' +
                    '{{#each shareOptions}}' +
                    '<span class="shareOption">' +
                    '<input id="attr-{{name}}-{{cid}}-{{shareWith}}" type="checkbox" name="{{name}}" class="onlyOfficeShareOption checkbox" {{#if checked}}checked="checked"{{/if}} data-share-id="{{shareId}}"/>' +
                    '<label for="attr-{{name}}-{{cid}}-{{shareWith}}">{{label}}</label>' +
                    '</span>' +
                    '{{/each}}' +
                    '</div>'
                );
            }
            return this._shareOptionsTemplate(data);
        }

    };

    OCA.Onlyoffice.ShareDialogView = {
        attach: function (view) {
            if (_.isUndefined(view) || _.isUndefined(view.model) || !!view.model.getRegisteredShareAttribute) {
                return;
            }
            var fileName = view.model.getFileInfo().attributes.name;

            var extension = OCA.Onlyoffice.GetFileExtension(fileName);

            var formats = OCA.Onlyoffice.setting.formats;

            var config = formats[extension];
            if (!config) {
                return;
            }
            OCA.Onlyoffice.ShareOptions.config = config;

            OCA.Onlyoffice.ShareOptions.model = view.model;

            // customize rendering of checkboxes
            var baseRenderCall = view.render;
            view.render = function() {
                baseRenderCall.call(view);
                OCA.Onlyoffice.ShareOptions.render(view);
            };

            var model = view.model;

            var baseAddShareCall = model.addShare;
            model.addShare = function(properties, options) {
                // add onlyoffice attributes
                var newProperties = OCA.Onlyoffice.ShareOptions.addShareProperties(properties);

                baseAddShareCall.call(model, newProperties, options || {});
            };

            var baseUpdateShareCall = model.updateShare;
            model.updateShare = function(shareId, properties, options) {
                // update for onlyoffice attributes
                var newProperties = OCA.Onlyoffice.ShareOptions.updateShareProperties(shareId, properties);

                baseUpdateShareCall.call(model, shareId, newProperties, options || {});
            };

            // Add call to watch for changes of shares
            model.on("change:shares", function(event) {
                OCA.Onlyoffice.ShareOptions.render(view);
            });
        }
    };

    // v10.2
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
        // v10.3
        OC.Plugins.register("OC.Share.ShareDialogView", OCA.Onlyoffice.ShareDialogView);

        // v10.2
        OC.Plugins.register("OC.Share.ShareItemModel", OCA.Onlyoffice.ShareItemModel);
    };

})(OCA);
