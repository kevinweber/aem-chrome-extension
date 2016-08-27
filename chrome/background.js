// Background Page
// Documentation: https://developer.chrome.com/extensions/event_pages
(function () {
  'use strict';

  var syncStorage = chrome.storage.sync,
    OPTIONS = {
      VERSION: chrome.app.getDetails().version
    };

  function clearStorage() {
    console.info("Storage cleared.");
    chrome.storage.sync.clear();
  }

  function splitUrl(url) {
    var parseUrl = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/,
      result = parseUrl.exec(url),
      names = ['url', 'scheme', 'slash', 'host', 'port', 'path', 'query', 'hash'],
      urlObject = {},
      i,
      l;

    for (i = 0, l = result.length; i < l; i += 1) {
      urlObject[names[i]] = result[i];
    }

    return urlObject;
  }

  function isValidPath(path) {
    var allowedPaths,
      i,
      l;

    allowedPaths = ["content/", "cf#", "editor.html"];

    for (i = 0, l = allowedPaths.length; i < l; i += 1) {
      if (path.substring(0, allowedPaths[i].length) === allowedPaths[i]) {
        return true;
      }
    }

    return false;
  }

  function isValidUrl(url) {
    var urlObject = splitUrl(url);

    if (urlObject.host !== "localhost") {
      return;
    }

    if (urlObject.port !== "4502") {
      return;
    }

    if (!isValidPath(urlObject.path)) {
      return;
    }

    return true;
  }

  syncStorage.get(null, function (items) {
    console.debug('STORAGE:', items);

    // Set version number
    items.extension = items.extension || {};
    items.extension.version = OPTIONS.VERSION;

    // Set up default options
    items.options = items.options || {};
    items.options.browserSync = items.options.browserSync || {};
    items.options.browserSync.isDisabled = items.options.browserSync.isDisabled || false;

    items.tabs = items.tabs || {};

    syncStorage.set(items);
  });

  function shouldAddScript(tab) {
    syncStorage.get(['options', 'tabs'], function (items) {
      if (!items.options.browserSync.isDisabled && isValidUrl(tab.url)) {
        chrome.tabs.sendMessage(tab.id, {
          task: "add-script"
        });

        items.tabs[tab.id] = {
          status: "default",
          url: tab.url
        };

        syncStorage.set(items);
        console.log('should add', items);
      }
    });
  }

  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    //    if (changeInfo.status === "loading") {
    //      chrome.tabs.sendMessage(tabId, {
    //        task: "add-identifier",
    //        data: OPTIONS.VERSION
    //      });
    //    }

    if (changeInfo.status === "complete") {
      //      console.debug('Updated page.', tabId, changeInfo, tab, tab.url);

      shouldAddScript(tab);
    }
  });

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.task === "update-storage") {
      syncStorage.set(message.data);
    }

    if (message.task === "clear-storage") {
      clearStorage();
    }
  });

  chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    syncStorage.get(['tabs'], function (items) {

      if (items.tabs[tabId]) {
        delete items.tabs[tabId];
        syncStorage.set(items);
      }
    });
  });
}());