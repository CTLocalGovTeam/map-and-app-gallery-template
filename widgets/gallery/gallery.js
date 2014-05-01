﻿/*global define,dojo,alert,unescape,ItemInfoPage */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/text!./templates/gallery.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!nls/localizedStrings",
    "widgets/itemDetails/itemDetails",
    "dojo/query",
    "dojo/dom-class",
    "dojo/on",
    "dojo/Deferred",
    "dojo/number",
    "dojo/topic",
    "dojo/dom-style",
    "esri/arcgis/utils",
    "dojo/dom-geometry"
], function (declare, domConstruct, lang, domAttr, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, nls, ItemDetails, query, domClass, on, Deferred, number, topic, domStyle, utils, domGeom) {

    declare("ItemGallery", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        nls: nls,
        /**
        *@class
        *@name  widgets/gallery/gallery
        */
        postCreate: function () {
            domConstruct.place(this.galleryView, query(".esriCTGalleryContent")[0]);
            this.own(topic.subscribe("createPods", lang.hitch(this, this.createItemPods)));
            if (dojo.configData.ApplicationSettings.defaultLayout.toLowerCase() === "list") {
                dojo.gridView = false;
            } else {
                dojo.gridView = true;
            }
            if (query(".esriCTSignInIcon")[0]) {
                if (domStyle.get(query(".esriCTSignInIcon")[0], "display") === "none") {
                    dojo.gridView = false;
                }
            }

            this.own(on(this.galleryNext, "click", lang.hitch(this, function () {
                var defObj, _self;
                topic.publish("showProgressIndicator");
                defObj = new Deferred();
                _self = this;
                topic.publish("queryGroupItem", null, null, null, defObj, dojo.nextQuery);
                defObj.then(function (data) {
                    var i;
                    dojo.nextQuery = data.nextQueryParams;
                    for (i = 0; i < data.results.length; i++) {
                        dojo.results.push(data.results[i]);
                    }
                    _self.createItemPods(data.results);
                }, function (err) {
                    topic.publish("hideProgressIndicator");
                    alert(err.message);
                });
            })));

            this.own(on(query(".esriCTBackBtn")[0], "click", lang.hitch(this, function () {
                domClass.add(query(".esriCTMenuTabRight")[0], "displayBlockAll");
                domClass.add(query(".esriCTDetailsLeftPanel")[0], "displayNoneAll");
                domClass.add(query(".esriCTDetailsRightPanel")[0], "displayNoneAll");
                domClass.remove(query(".esriCTGalleryContent")[0], "displayNoneAll");
                domClass.remove(query(".esriCTInnerRightPanel")[0], "displayNoneAll");
                domClass.remove(query(".esriCTApplicationIcon")[0], "esriCTCursorPointer");
            })));

            on(window, "resize", lang.hitch(this, function () {
                var height, containerHeight;
                if (domClass.contains(query(".esriCTInnerLeftPanelBottom")[0], "esriCTInnerLeftPanelBottomShift")) {
                    query(".esriCTInnerLeftPanelBottom")[0].style.height = dojo.window.getBox().h + "px";
                }
                if (domClass.contains(query(".esriCTInnerLeftPanelTop")[0], "displayBlock")) {
                    height = window.innerHeight - (domGeom.position(query(".esriCTMenuTab")[0]).h + domGeom.position(query(".esriCTInnerLeftPanelBottom")[0]).h + domGeom.position(query(".esriCTLogo")[0]).h + 50) + "px";
                    domStyle.set(query(".esriCTLeftPanelDesc")[0], "maxHeight", height);
                }
                containerHeight = (window.innerHeight - domGeom.position(query(".esriCTMenuTab")[0]).h - 15) + "px";
                domStyle.set(query(".esriCTInnerRightPanel")[0], "height", containerHeight);
            }));
            var containerHeight = (window.innerHeight - domGeom.position(query(".esriCTMenuTab")[0]).h - 15) + "px";
            domStyle.set(query(".esriCTInnerRightPanel")[0], "height", containerHeight);
        },

        /**
        * Creates the gallery item pods
        * @memberOf widgets/gallery/gallery
        */
        createItemPods: function (itemResults, clearContainerFlag) {
            var i, divPodParentList, divPodParent;

            if (clearContainerFlag) {
                domConstruct.empty(this.itemPodsList);
            }
            if (query(".esriCTShowMoreResults")[0]) {
                if (itemResults.length !== 100) {
                    domClass.replace(query(".esriCTShowMoreResults")[0], "displayNoneAll", "displayBlockAll");
                } else {
                    domClass.replace(query(".esriCTShowMoreResults")[0], "displayBlockAll", "displayNoneAll");
                }
            }

            for (i = 0; i < itemResults.length; i++) {
                if (!dojo.gridView) {
                    divPodParentList = domConstruct.create('div', { "class": "esriCTApplicationListBox" }, this.itemPodsList);
                    this._createThumbnails(itemResults[i], divPodParentList);
                    this._createItemOverviewPanel(itemResults[i], divPodParentList);
                } else {
                    divPodParent = domConstruct.create('div', { "class": "esriCTApplicationBox" }, this.itemPodsList);
                    this._createThumbnails(itemResults[i], divPodParent);
                    this._createGridItemOverview(itemResults[i], divPodParent);
                }
            }
            topic.publish("hideProgressIndicator");
        },

        /**
        * Create HTML for grid layout
        * @memberOf widgets/gallery/gallery
        */
        _createGridItemOverview: function (itemResult, divPodParent) {
            var divItemTitleRight, divItemTitleText, divItemType, spanItemType, divItemWatchEye, spanItemWatchEyeText;

            divItemTitleRight = domConstruct.create('div', { "class": "esriCTDivClear" }, divPodParent);
            divItemTitleText = domConstruct.create('div', { "class": "esriCTListAppTitle esriCTGridTitleContent esriCTCursorPointer" }, divItemTitleRight);
            domAttr.set(divItemTitleText, "innerHTML", (itemResult.title) || (nls.showNullValue));
            domAttr.set(divItemTitleText, "title", (itemResult.title) || (nls.showNullValue));
            divItemType = domConstruct.create('div', { "class": "esriCTGridItemType" }, divItemTitleRight);
            spanItemType = domConstruct.create('div', { "class": "esriCTInnerGridItemType" }, divItemType);
            domAttr.set(spanItemType, "innerHTML", (itemResult.type) || (nls.shoNullValue));
            domAttr.set(spanItemType, "title", (itemResult.type) || (nls.shoNullValue));
            divItemWatchEye = domConstruct.create('div', { "class": "esriCTEyeNumViews esriCTEyeNumViewsGrid" }, divItemType);
            domConstruct.create('span', { "class": "esriCTEyeIcon icon-eye" }, divItemWatchEye);
            spanItemWatchEyeText = domConstruct.create('span', { "class": "view" }, divItemWatchEye);
            domAttr.set(spanItemWatchEyeText, "innerHTML", (itemResult.numViews) ? (number.format(parseInt(itemResult.numViews, 10))) : (nls.showNullValue));
            this.own(on(divItemTitleText, "click", lang.hitch(this, function () {
                topic.publish("showProgressIndicator");
                this.showInfoPage(this, itemResult);
            })));
        },

        /**
        * Create the thumbnails displayed for gallery items
        * @memberOf widgets/gallery/gallery
        */
        _createThumbnails: function (itemResult, divPodParent) {
            var divThumbnail, divThumbnailImage, divTagContainer, divTagContent;

            if (!dojo.gridView) {
                divThumbnail = domConstruct.create('div', { "class": "esriCTImageContainerList" }, divPodParent);
            } else {
                divThumbnail = domConstruct.create('div', { "class": "esriCTImageContainer" }, divPodParent);
            }

            divThumbnailImage = domConstruct.create('div', { "class": "esriCTAppImage" }, divThumbnail);
            if (itemResult.thumbnailUrl) {
                domStyle.set(divThumbnailImage, "background", 'url(' + itemResult.thumbnailUrl + ') no-repeat center center');
            } else {
                domClass.add(divThumbnailImage, "esriCTNoThumbnailImage");
            }

            divTagContainer = domConstruct.create('div', { "class": "esriCTSharingTag" }, divThumbnailImage);
            divTagContent = domConstruct.create('div', { "class": "esriCTTag" }, divTagContainer);

            if (dojo.configData.ApplicationSettings.displaySharingAttribute) {
                this._accessLogoType(itemResult, divTagContent);
            }
            domAttr.set(divThumbnailImage, "selectedItem", itemResult.id);
            domAttr.set(divThumbnailImage, "selectedThumbnail", itemResult.thumbnailUrl);
            this.own(on(divThumbnailImage, "click", lang.hitch(this, function () {
                var itemId, thumbnailUrl;

                itemId = domAttr.get(divThumbnailImage, "selectedItem");
                thumbnailUrl = domAttr.get(divThumbnailImage, "selectedThumbnail");
                this._showItemOverview(itemId, thumbnailUrl, itemResult, true);
            })));
        },

        /**
        * Executed when user clicks on a item thumbnail or clicks the button on the item info page. It performs a query to fetch the type of the selected item.
        * @memberOf widgets/gallery/gallery
        */
        _showItemOverview: function (itemId, thumbnailUrl, itemResult, flag) {
            var tokenString, _self = this, itemUrl, defObj, itemDetails;

            if (dojo.configData.ApplicationSettings.token) {
                tokenString = "&token=" + dojo.configData.ApplicationSettings.token;
            } else {
                tokenString = '';
            }
            itemUrl = dojo.configData.ApplicationSettings.portalURL + "/sharing/content/items/" + itemId + "?f=json" + tokenString;
            defObj = new Deferred();
            defObj.then(function (data) {
                var dataType, tokenString2, downloadPath;

                if (data) {
                    data.thumbnailUrl = thumbnailUrl;
                    dataType = data.type.toLowerCase();
                    if ((dataType === "map service") || (dataType === "web map") || (dataType === "feature service") || (dataType === "kml") || (dataType === "wms")) {
                        if (dojo.configData.ApplicationSettings.useItemPage && flag) {
                            _self.showInfoPage(_self, itemResult);
                        } else {
                            if ((dataType === "web map") && dojo.configData.ApplicationSettings.mapViewer.toLowerCase() === "arcgis") {
                                window.open(dojo.configData.ApplicationSettings.portalURL + '/home/item.html?id=' + itemId, "_self");
                            } else {
                                itemDetails = new ItemDetails({ data: data });
                                itemDetails.startup();
                            }
                        }
                    } else {
                        if (data.url) {
                            window.open(data.url);
                        } else if (data.itemType.toLowerCase() === "file") {
                            if (dojo.configData.ApplicationSettings.token) {
                                tokenString2 = "?token=" + dojo.configData.ApplicationSettings.token;
                            } else {
                                tokenString2 = '';
                            }
                            if (dojo.configData.ApplicationSettings.useItemPage && flag) {
                                _self.showInfoPage(_self, itemResult);
                            } else {
                                downloadPath = dojo.configData.ApplicationSettings.portalURL + "/sharing/content/items/" + itemId + "/data" + tokenString2;
                                window.open(downloadPath);
                            }
                        } else {
                            alert(nls.errorMessages.unableToOpenItem);
                        }
                    }
                }
            }, function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
            topic.publish("queryItemInfo", itemUrl, defObj);
        },

        /**
        * Create a tag on the thumbnail image to indicate the access type of the item
        * @memberOf widgets/gallery/gallery
        */
        _accessLogoType: function (itemResult, divTagContent) {
            var title;
            if (itemResult.access === "public") {
                title = nls.allText;
            } else if (itemResult.access === "org") {
                title = nls.orgText;
            } else {
                title = nls.grpText;
            }
            if (divTagContent) {
                domAttr.set(divTagContent, "innerHTML", title);
            }
        },

        /**
        * Create HTML for list layout
        * @memberOf widgets/gallery/gallery
        */
        _createItemOverviewPanel: function (itemResult, divPodParent) {
            var divContent, divTitle, divItemTitle, divItemTitleRight, divItemTitleText, divItemInfo, divItemType,
                divRatings, numberStars, i, imgRating, divItemWatchEye, spanItemWatchEyeText, divItemContent,
                divItemSnippet, spanItemReadMore;

            divContent = domConstruct.create('div', { "class": "esriCTListContent" }, divPodParent);
            divTitle = domConstruct.create('div', { "class": "esriCTAppListTitle" }, divContent);

            divItemTitle = domConstruct.create('div', { "class": "esriCTAppListTitleRight" }, divTitle);
            divItemTitleRight = domConstruct.create('div', { "class": "esriCTDivClear" }, divItemTitle);
            divItemTitleText = domConstruct.create('div', { "class": "esriCTListAppTitle esriCTCursorPointer" }, divItemTitleRight);
            domAttr.set(divItemTitleText, "innerHTML", (itemResult.title) || (nls.showNullValue));

            divItemInfo = domConstruct.create('div', {}, divItemTitle);

            divItemType = domConstruct.create('div', { "class": "esriCTListItemType" }, divItemInfo);
            domAttr.set(divItemType, "innerHTML", (itemResult.type) || (nls.showNullValue));

            divRatings = domConstruct.create('div', { "class": "esriCTRatingsDiv" }, divItemInfo);
            numberStars = Math.round(itemResult.avgRating);
            for (i = 0; i < 5; i++) {
                imgRating = document.createElement("span");
                imgRating.value = (i + 1);
                divRatings.appendChild(imgRating);
                if (i < numberStars) {
                    domClass.add(imgRating, "icon-star esriCTRatingStarIcon esriCTRatingStarIconColor");
                } else {
                    domClass.add(imgRating, "icon-star-empty esriCTRatingStarIcon esriCTRatingStarIconColor");
                }
            }

            divItemWatchEye = domConstruct.create('div', { "class": "esriCTEyeNumViews esriCTEyeNumViewsList" }, divItemInfo);
            domConstruct.create('span', { "class": "esriCTEyeIcon icon-eye esriCTEyeIconPadding" }, divItemWatchEye);
            spanItemWatchEyeText = domConstruct.create('span', { "class": "view" }, divItemWatchEye);
            domAttr.set(spanItemWatchEyeText, "innerHTML", (itemResult.numViews) ? (number.format(parseInt(itemResult.numViews, 10))) : (nls.showNullValue));

            divItemContent = domConstruct.create('div', { "class": "esriCTListAppContent" }, divContent);
            divItemSnippet = domConstruct.create('div', { "class": "esriCTAppHeadline" }, divItemContent);
            if (itemResult.snippet) {
                spanItemReadMore = domConstruct.create('span', {}, divItemSnippet);
                domAttr.set(spanItemReadMore, "innerHTML", itemResult.snippet);
            }
            this.own(on(divItemTitleText, "click", lang.hitch(this, function () {
                topic.publish("showProgressIndicator");
                this.showInfoPage(this, itemResult);
            })));
        },

        showInfoPage: function (_self, itemResult) {
            var infoPage = new ItemInfoPage();
            infoPage.displayPanel(itemResult, _self);
        }
    });

    declare("ItemInfoPage", null, {
        /**
        * Create the HTML for item info page
        * @memberOf widgets/gallery/gallery
        */
        displayPanel: function (itemResult, _self) {
            var numberOfComments, numberOfRatings, numberOfViews, itemReviewDetails, itemDescription, accessContainer, accessInfo, defObj;

            domClass.replace(query(".esriCTApplicationIcon")[0], "esriCTCursorPointer", "esriCTCursorDefault");
            domClass.replace(query(".esriCTMenuTabRight")[0], "displayNoneAll", "displayBlockAll");
            domClass.replace(query(".esriCTInnerRightPanel")[0], "displayNoneAll", "displayBlockAll");
            domClass.remove(_self.detailsLeftPanel, "displayNoneAll");
            domClass.remove(_self.detailsRightPanel, "displayNoneAll");
            domConstruct.empty(_self.detailsContent);
            domConstruct.empty(_self.ratingsContainer);

            if (itemResult.thumbnailUrl) {
                domStyle.set(_self.appThumbnail, "background", 'url(' + itemResult.thumbnailUrl + ') no-repeat center center');
            } else {
                domClass.add(_self.appThumbnail, "esriCTNoThumbnailImage");
            }

            domAttr.set(_self.applicationType, "innerHTML", (itemResult.type) || (nls.showNullValue));
            domAttr.set(_self.appTitle, "innerHTML", dojo.configData.ApplicationSettings.mapTitle || (itemResult.title || ""));
            if (dojo.configData.ApplicationSettings.showViews) {
                numberOfComments = (itemResult.numComments) || "0";
                numberOfRatings = (itemResult.numRatings) || "0";
                numberOfViews = (itemResult.numViews) ? (number.format(parseInt(itemResult.numViews, 10))) : "0";
                itemReviewDetails = "(" + numberOfComments + " " + nls.numberOfCommentsText + ", " + numberOfRatings + " " + nls.numberOfRatingsText + ", " + numberOfViews + " " + nls.numberOfViewsText + ")";
                domAttr.set(_self.numOfCommentsViews, "innerHTML", itemReviewDetails);
            }
            domAttr.set(_self.itemSnippet, "innerHTML", dojo.configData.ApplicationSettings.mapSnippet || (itemResult.snippet || ""));
            domConstruct.create('div', { "class": "esriCTReviewHeader", "innerHTML": nls.appDesText }, _self.detailsContent);
            itemDescription = domConstruct.create('div', { "class": "esriCTText esriCTReviewContainer esriCTBottomBorder" }, _self.detailsContent);
            if (dojo.configData.ApplicationSettings.showLicenseInfo) {
                accessContainer = domConstruct.create('div', { "class": "esriCTReviewContainer esriCTBottomBorder" }, _self.detailsContent);
                domConstruct.create('div', { "class": "esriCTReviewHeader", "innerHTML": nls.accessConstraintsText }, accessContainer);
                accessInfo = domConstruct.create('div', { "class": "esriCTText" }, accessContainer);
                domAttr.set(accessInfo, "innerHTML", dojo.configData.ApplicationSettings.mapLicenseInfo || (itemResult.licenseInfo || ""));
            }
            domAttr.set(_self.btnTryItNow, "innerHTML", "");
            defObj = new Deferred();
            defObj.then(lang.hitch(this, function () {
                this._createItemDescription(itemResult, _self, itemDescription);
            }, function (err) {
                alert(err.message);
            }));
            this._createPropertiesContent(itemResult, _self.detailsContent, defObj);

            if (_self._btnTryItNowHandle) {
                /**
                * remove the click event handler if it already exists, to prevent the binding of the event multiple times
                */
                _self._btnTryItNowHandle.remove();
            }
            _self._btnTryItNowHandle = on(_self.btnTryItNow, "click", lang.hitch(this, function () {
                var itemId, thumbnailUrl;
                itemId = domAttr.get(_self.btnTryItNow, "selectedItem");
                thumbnailUrl = domAttr.get(_self.btnTryItNow, "selectedThumbnail");
                _self._showItemOverview(itemId, thumbnailUrl, itemResult, false);
            }));
        },

        /**
        * Extract the item info (tags, extent) and display it in the created properties container
        * @memberOf widgets/gallery/gallery
        */
        _createPropertiesContent: function (itemResult, detailsContent, defObj) {
            var itemDeferred, _self = this, propertiesContainer, tagsContent, i, itemTags, sizeContent, extentContent, extentValue;

            itemDeferred = utils.getItem(itemResult.id);
            _self = this;
            itemDeferred.addCallback(function (itemInfo) {
                propertiesContainer = domConstruct.create('div', { "class": "esriCTReviewContainer" }, detailsContent);
                domConstruct.create('div', { "innerHTML": nls.propertiesText, "class": "esriCTReviewHeader" }, propertiesContainer);
                tagsContent = domConstruct.create('div', { "class": "esriCTPropertiesContainer" }, propertiesContainer);
                domConstruct.create('div', { "class": "esriCTPropertiesContent", "innerHTML": nls.tagsText }, tagsContent);
                for (i = 0; i < itemInfo.item.tags.length; i++) {
                    if (i === 0) {
                        itemTags = itemInfo.item.tags[i];
                    } else {
                        itemTags = itemTags + ", " + itemInfo.item.tags[i];
                    }
                }
                domConstruct.create('div', { "class": "esriCTPropertiesValue", "innerHTML": itemTags }, tagsContent);
                sizeContent = domConstruct.create('div', { "class": "esriCTPropertiesContainer" }, propertiesContainer);
                domConstruct.create('div', { "class": "esriCTPropertiesContent", "innerHTML": nls.sizeText }, sizeContent);
                domConstruct.create('div', { "class": "esriCTPropertiesValue", "innerHTML": itemInfo.item.size }, sizeContent);
                extentContent = domConstruct.create('div', { "class": "esriCTPropertiesContainer" }, propertiesContainer);
                domConstruct.create('div', { "class": "esriCTPropertiesContent", "innerHTML": nls.extentText }, extentContent);
                extentValue = domConstruct.create('div', { "class": "esriCTPropertiesValue" }, extentContent);
                if (itemInfo.item.extent.length > 0) {
                    _self._createItemExtentContent(extentValue, nls.extentLeftText, nls.extentRightText, itemInfo.item.extent[0][0], itemInfo.item.extent[1][0]);
                    _self._createItemExtentContent(extentValue, nls.extentTopText, nls.extentBottomText, itemInfo.item.extent[0][1], itemInfo.item.extent[1][1]);
                }
                domClass.add(propertiesContainer, "esriCTBottomBorder");
                defObj.resolve();
            });
            itemDeferred.addErrback(function () {
                defObj.resolve();
                topic.publish("hideProgressIndicator");
            });
        },

        /**
        * Create the item description container
        * @memberOf widgets/gallery/gallery
        */
        _createItemDescription: function (itemResult, _self, itemDescription) {
            var tokenString, itemUrl, defObject, detailsContainer, divDetailsContent, numberStars, i, imgRating;

            domAttr.set(itemDescription, "innerHTML", dojo.configData.ApplicationSettings.mapItemDescription || (itemResult.description || ""));
            domAttr.set(_self.itemCategory, "innerHTML", dojo.configData.ApplicationSettings.mapTitle || (itemResult.title || ""));
            domAttr.set(_self.itemSubmittedBy, "innerHTML", (itemResult.owner) || (nls.showNullValue));
            if (dojo.configData.ApplicationSettings.token) {
                tokenString = "&token=" + dojo.configData.ApplicationSettings.token;
            } else {
                tokenString = '';
            }
            itemUrl = dojo.configData.ApplicationSettings.portalURL + "/sharing/content/items/" + itemResult.id + "?f=json" + tokenString;
            defObject = new Deferred();
            defObject.then(function (data) {
                if (data) {
                    if (data.itemType === "file" && data.type.toLowerCase() !== "kml") {
                        domAttr.set(_self.btnTryItNow, "innerHTML", nls.downloadButtonText);
                        domClass.add(_self.btnTryItNow, "esriCTDownloadButton");
                    } else {
                        domAttr.set(_self.btnTryItNow, "innerHTML", nls.tryItButtonText);
                        domClass.remove(_self.btnTryItNow, "esriCTDownloadButton");
                    }
                }
                topic.publish("hideProgressIndicator");
            }, function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
            topic.publish("queryItemInfo", itemUrl, defObject);

            /**
            * if showMoreInfo flag is set to true in config file and item is of type web map
            */
            if (dojo.configData.ApplicationSettings.showMoreInfo && itemResult.type.toLowerCase() === "web map") {
                /**
                * item page link
                */
                detailsContainer = domConstruct.create('div', { "class": "esriCTReviewContainer esriCTBottomBorder" }, _self.detailsContent);
                domConstruct.create('div', { "class": "esriCTReviewHeader", "innerHTML": nls.detailsContentText }, detailsContainer);
                divDetailsContent = domConstruct.create('div', { "class": "esriCTMoreInfo esriCTDivClear", "innerHTML": nls.detailsLinkText }, detailsContainer);
                if (_self._moreInfoHandle) {
                    _self._moreInfoHandle.remove();
                }
                _self._moreInfoHandle = on(divDetailsContent, "click", lang.hitch(this, function () {
                    window.open(dojo.configData.ApplicationSettings.portalURL + '/home/item.html?id=' + itemResult.id);
                }));
            }
            /**
            * if showComments flag is set to true in config file
            */
            if (dojo.configData.ApplicationSettings.showComments) {
                this._createCommentsContainer(itemResult, _self.detailsContent);
            }
            /**
            * if showRatings flag is set to true in config file
            */
            if (dojo.configData.ApplicationSettings.showRatings) {
                numberStars = Math.round(itemResult.avgRating);
                for (i = 0; i < 5; i++) {
                    imgRating = document.createElement("span");
                    imgRating.value = (i + 1);
                    _self.ratingsContainer.appendChild(imgRating);
                    if (i < numberStars) {
                        domClass.add(imgRating, "icon-star esriCTRatingStarIcon esriCTRatingStarIconColor");
                    } else {
                        domClass.add(imgRating, "icon-star-empty esriCTRatingStarIcon esriCTRatingStarIconColor");
                    }
                }
            }
            domAttr.set(_self.btnTryItNow, "selectedItem", itemResult.id);
            domAttr.set(_self.btnTryItNow, "selectedThumbnail", itemResult.thumbnailUrl);
        },

        /**
        * Query the item to fetch comments and display the data in the comments container displayed on the item info page
        * @memberOf widgets/gallery/gallery
        */
        _createCommentsContainer: function (itemResult, detailsContent) {
            var reviewContainer = domConstruct.create('div', { "class": "esriCTReviewContainer esriCTBottomBorder" }, detailsContent);
            domConstruct.create('div', { "class": "esriCTReviewHeader", "innerHTML": nls.reviewText }, reviewContainer);
            itemResult.getComments().then(function (result) {
                var i, divReview, divReviewHeader, divReviewText, comment;

                if (result.length > 0) {
                    for (i = 0; i < result.length; i++) {
                        divReview = domConstruct.create('div', { "class": "esriCTReview" }, reviewContainer);
                        divReviewHeader = domConstruct.create('div', { "class": "esriCTReviewBold" }, divReview);
                        divReviewText = domConstruct.create('div', { "class": "esriCTReviewText esriCTBreakWord" }, divReview);
                        domAttr.set(divReviewHeader, "innerHTML", (result[i].created) ? (result[i].created.toLocaleDateString()) : (nls.showNullValue));
                        try {
                            comment = decodeURIComponent(result[i].comment);
                        } catch (e) {
                            comment = unescape(result[i].comment);
                        }
                        domAttr.set(divReviewText, "innerHTML", (result[i].comment) ? comment : (nls.showNullValue));
                    }
                } else {
                    divReview = domConstruct.create('div', { "class": "esriCTDivClear" }, reviewContainer);
                    divReviewText = domConstruct.create('div', { "class": "esriCTBreakWord" }, divReview);
                    domAttr.set(divReviewText, "innerHTML", nls.showNullValue);
                }
            }, function (err) {
                var divReview, divReviewText;
                divReview = domConstruct.create('div', { "class": "esriCTDivClear" }, reviewContainer);
                divReviewText = domConstruct.create('div', { "class": "esriCTBreakWord" }, divReview);
                domAttr.set(divReviewText, "innerHTML", err.message);
            });
        },

        /**
        * Create the extent container and display the extent data
        * @memberOf widgets/gallery/gallery
        */
        _createItemExtentContent: function (divParent, firstKey, secondKey, firstValue, secondValue) {
            var extentContent, extentInnerDivFirst, extentInnerDivSecond;

            extentContent = domConstruct.create('div', { "class": "esriCTExtent" }, divParent);
            extentInnerDivFirst = domConstruct.create('div', { "class": "esriCTExtentLeft" }, extentContent);
            domConstruct.create('span', { "innerHTML": firstKey, "class": "esriCTExtentspan" }, extentInnerDivFirst);
            domConstruct.create('span', { "innerHTML": firstValue }, extentInnerDivFirst);
            extentInnerDivSecond = domConstruct.create('div', { "class": "esriCTExtentLeft" }, extentContent);
            domConstruct.create('span', { "innerHTML": secondKey, "class": "esriCTExtentspan" }, extentInnerDivSecond);
            domConstruct.create('span', { "innerHTML": secondValue }, extentInnerDivSecond);
        }
    });
});
