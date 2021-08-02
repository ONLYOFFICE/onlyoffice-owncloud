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
            AppName: "onlyoffice"
        }, OCA.Onlyoffice);

    // api v2
    OCA.Onlyoffice.ShareOptions = {

        /**
         * @type {OCA.Share.ShareItemModel}
         */
        model: null,

        config: null,

        _shareOptionsTemplate: null,

        validateShareProperties: function (properties) {
            if (this.model.hasReshare()) {
                // it is enough to check the parent share attributes
                // if these are set to avoid privilege escalation
                var parentShareAttributes = this.model.getReshareAttributes();

                var download = this._getAttribute(parentShareAttributes, "permissions", "download");
                var review = this._getAttribute(parentShareAttributes, OCA.Onlyoffice.AppName, "review");
                var fillForms = this._getAttribute(parentShareAttributes, OCA.Onlyoffice.AppName, "fillForms");
                var comment = this._getAttribute(parentShareAttributes, OCA.Onlyoffice.AppName, "comment");
                var modifyFilter = this._getAttribute(parentShareAttributes, OCA.Onlyoffice.AppName, "modifyFilter");
                if (review !== null || fillForms !== null || comment !== null || modifyFilter !== null ||
                    (download !== null && download.enabled === false)) {
                    OC.dialogs.alert(
                        t(OCA.Onlyoffice.AppName, 'This file is shared with you using ' +
                            'permissions lower than the requested update. ' +
                            'Please ask share owner to reshare the file with you ' +
                            'using correct permissions.'),
                        t(OCA.Onlyoffice.AppName, 'Error while sharing')
                    );
                    return false;
                }
            }
            return true;
        },

        /**
         * Extend ShareItemModel.addShare with onlyoffice attributes
         *
         * @param properties
         */
        addShareProperties: function (properties) {
            var extendedProperties = properties;

            extendedProperties.attributes = properties.attributes || {};

            // get default permissions
            extendedProperties.permissions = this.model.getDefaultPermissions();

            // disable resharing as it is not supported currently
            extendedProperties.permissions = this._removePermission(
                extendedProperties.permissions, OC.PERMISSION_SHARE
            );

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
            }

            return extendedProperties;
        },

        /**
         * Extend ShareItemModel.updateShare with onlyoffice attributes. This
         * is triggered on click on call to updateShare from core or other app
         *
         * @param shareId
         * @param properties
         */
        updateShareProperties: function (shareId, properties) {
            if (_.isUndefined(properties.permissions) && _.isUndefined(properties.attributes)) {
                // no attribute or permission change, ignore
                return properties;
            }

            var updatedProperties = properties;
            updatedProperties.attributes = properties.attributes || {};

            // if share permission got enabled unset all attributes
            // as resharing is not compatible
            if (this._hasPermission(properties.permissions, OC.PERMISSION_SHARE)) {
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
            if (this._hasPermission(properties.permissions, OC.PERMISSION_UPDATE)
                || this._hasPermission(properties.permissions, OC.PERMISSION_CREATE)
                || this._hasPermission(properties.permissions, OC.PERMISSION_DELETE)) {
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

            // default checkboxes on permission update
            var canDownload = this._getAttribute(properties.attributes, "permissions", "download");
            if (canDownload === null) {
                // if this attribute has not been set by other app, set to tru as default
                updatedProperties.attributes = this._updateAttributes(
                    updatedProperties.attributes, "permissions", "download", true
                );
            }

            if (!this.model.hasReshare()
                || this._hasPermission(this.model.attributes.permissions, OC.PERMISSION_UPDATE))
            {
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
            }

            updatedProperties.attributes = this._updateAttributes(
                updatedProperties.attributes, OCA.Onlyoffice.AppName, "modifyFilter", null
            );

            return updatedProperties;
        },

        /**
         * Click on custom checkbox handler. Adjust required app/core attributes and
         * permissions. This is triggered only on click on onlyoffice attribute
         *
         * @param event
         */
        onOnlyOfficeOptionChange: function (event) {
            var that = this;
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

            // parse current checkboxes
            var attributes = share.attributes || {};
            $("li[data-share-id='" + shareId + "'] .onlyOfficeShareOption").each(function (index, checkbox) {
                var shareOptionAttrScope = $(checkbox).data("attr-scope");
                var shareOptionAttrKey = $(checkbox).data("attr-key");
                var shareOptionChecked = $(checkbox).is(":checked");

                attributes = that._updateAttributes(
                    attributes, shareOptionAttrScope, shareOptionAttrKey, shareOptionChecked
                );
            });

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
                {
                    onlyofficeUpdatedShareProperties: true
                }
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
                    var shareOptionsData = [];
                    var attributes = [
                        { key: "download", scope: "permissions"},
                        { key: "review", scope: OCA.Onlyoffice.AppName },
                        { key: "fillForms", scope: OCA.Onlyoffice.AppName },
                        { key: "comment", scope: OCA.Onlyoffice.AppName },
                        { key: "modifyFilter", scope: OCA.Onlyoffice.AppName }
                    ];
                    for (var attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
                        var attribute = this._getAttribute(
                            share.attributes, attributes[attributeIndex].scope, attributes[attributeIndex].key
                        );

                        if (attribute === null || attribute.enabled === null) {
                            continue;
                        }

                        var label;
                        if (attribute.key === "download") {
                            label = t(OCA.Onlyoffice.AppName, "download");
                        } else if (attribute.key === "review") {
                            label = t(OCA.Onlyoffice.AppName, "review");
                        } else if (attribute.key === "fillForms") {
                            label = t(OCA.Onlyoffice.AppName, "form filling");
                        } else if (attribute.key === "comment") {
                            label = t(OCA.Onlyoffice.AppName, "comment");
                        } else if (attribute.key === "modifyFilter") {
                            label = t(OCA.Onlyoffice.AppName, "custom filter");
                        } else {
                            continue;
                        }

                        shareOptionsData.push({
                            cid: view.cid,
                            shareId: share.id,
                            shareWith: share.share_with,
                            attrScope: attribute.scope,
                            attrKey: attribute.key,
                            name: OCA.Onlyoffice.AppName + "-" + attribute.key,
                            label: label,
                            checked: attribute.enabled
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

        _getAttribute: function (attributes, scope, key) {
            for (var i in attributes) {
                if (attributes[i].scope === scope
                    && attributes[i].key === key
                    && attributes[i].enabled !== null) {
                    return attributes[i];
                }
            }

            return null;
        },

        _updateAttributes: function (attributes, scope, key, enabled) {
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

        _hasPermission: function (permissions, permission) {
            return (permissions & permission) === permission;
        },

        _removePermission: function (permissions, permission) {
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
                    '<input id="attr-{{name}}-{{cid}}-{{shareWith}}" type="checkbox" name="{{name}}" class="onlyOfficeShareOption checkbox" {{#if checked}}checked="checked"{{/if}} data-attr-scope="{{attrScope}}" data-attr-key="{{attrKey}}" data-share-id="{{shareId}}"/>' +
                    '<label for="attr-{{name}}-{{cid}}-{{shareWith}}">{{label}}</label>' +
                    '</span>' +
                    '{{/each}}' +
                    '</div>'
                );
            }
            return this._shareOptionsTemplate(data);
        }
    };

    // api v2
    OCA.Onlyoffice.ShareDialogView = {
        attach: function (view) {
            if (_.isUndefined(view) || _.isUndefined(view.model) || OCA.Onlyoffice.setting.shareAttributesVersion !== "v2") {
                return;
            }
            if (view.model.getFileInfo().attributes.type !== "file") {
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
            view.render = function () {
                baseRenderCall.call(view);
                OCA.Onlyoffice.ShareOptions.render(view);
            };

            var model = view.model;

            var baseAddShareCall = model.addShare;
            model.addShare = function (properties, options) {
                // add onlyoffice attributes
                var newProperties = OCA.Onlyoffice.ShareOptions.addShareProperties(properties);

                if (!OCA.Onlyoffice.ShareOptions.validateShareProperties(newProperties)) {
                    if (_.isFunction(options.error)) {
                        options.error(model, t(OCA.Onlyoffice.AppName, 'Error while sharing'));
                    }
                    return;
                }

                baseAddShareCall.call(model, newProperties, options || {});
            };

            var baseUpdateShareCall = model.updateShare;
            model.updateShare = function (shareId, properties, options) {
                var newProperties = properties || {};
                var newOptions = options || {};

                // update for onlyoffice attributes
                if (!options.hasOwnProperty("onlyofficeUpdatedShareProperties")) {
                    newProperties = OCA.Onlyoffice.ShareOptions.updateShareProperties(shareId, properties);
                    _.extend(newOptions, { onlyofficeUpdatedShareProperties: true });
                }

                if (!OCA.Onlyoffice.ShareOptions.validateShareProperties(newProperties)) {
                    if (_.isFunction(options.error)) {
                        options.error(model, t(OCA.Onlyoffice.AppName, 'Error while sharing'));
                    }
                    return;
                }

                baseUpdateShareCall.call(model, shareId, newProperties, newOptions);
            };

            // Add call to watch for changes of shares
            model.on("change:shares", function (event) {
                OCA.Onlyoffice.ShareOptions.render(view);
            });
        }
    };

    // api v1
    OCA.Onlyoffice.ShareItemModel = {
        attach: function (model) {
            if (_.isUndefined(model) || OCA.Onlyoffice.setting.shareAttributesVersion !== "v1") {
                return;
            }
            if (model.getFileInfo().attributes.type !== "file") {
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
                    "label": t(OCA.Onlyoffice.AppName, "custom filter"),
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
        // api v2
        OC.Plugins.register("OC.Share.ShareDialogView", OCA.Onlyoffice.ShareDialogView);

        // api v1
        OC.Plugins.register("OC.Share.ShareItemModel", OCA.Onlyoffice.ShareItemModel);
    };

})(OCA);
