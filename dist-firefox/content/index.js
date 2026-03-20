"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/webextension-polyfill/dist/browser-polyfill.js
  var require_browser_polyfill = __commonJS({
    "node_modules/webextension-polyfill/dist/browser-polyfill.js"(exports, module) {
      (function(global, factory) {
        if (typeof define === "function" && define.amd) {
          define("webextension-polyfill", ["module"], factory);
        } else if (typeof exports !== "undefined") {
          factory(module);
        } else {
          var mod = {
            exports: {}
          };
          factory(mod);
          global.browser = mod.exports;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : exports, function(module2) {
        "use strict";
        if (!(globalThis.chrome && globalThis.chrome.runtime && globalThis.chrome.runtime.id)) {
          throw new Error("This script should only be loaded in a browser extension.");
        }
        if (!(globalThis.browser && globalThis.browser.runtime && globalThis.browser.runtime.id)) {
          const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
          const wrapAPIs = (extensionAPIs) => {
            const apiMetadata = {
              "alarms": {
                "clear": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "clearAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "get": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "bookmarks": {
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getChildren": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getRecent": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getSubTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTree": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "browserAction": {
                "disable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "enable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "getBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "openPopup": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "browsingData": {
                "remove": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "removeCache": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCookies": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeDownloads": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFormData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeHistory": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeLocalStorage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePasswords": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePluginData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "settings": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "commands": {
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "contextMenus": {
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "cookies": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAllCookieStores": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "set": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "devtools": {
                "inspectedWindow": {
                  "eval": {
                    "minArgs": 1,
                    "maxArgs": 2,
                    "singleCallbackArg": false
                  }
                },
                "panels": {
                  "create": {
                    "minArgs": 3,
                    "maxArgs": 3,
                    "singleCallbackArg": true
                  },
                  "elements": {
                    "createSidebarPane": {
                      "minArgs": 1,
                      "maxArgs": 1
                    }
                  }
                }
              },
              "downloads": {
                "cancel": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "download": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "erase": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFileIcon": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "open": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "pause": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFile": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "resume": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "extension": {
                "isAllowedFileSchemeAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "isAllowedIncognitoAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "history": {
                "addUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "deleteRange": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getVisits": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "i18n": {
                "detectLanguage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAcceptLanguages": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "identity": {
                "launchWebAuthFlow": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "idle": {
                "queryState": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "management": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getSelf": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setEnabled": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "uninstallSelf": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "notifications": {
                "clear": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPermissionLevel": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "pageAction": {
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "hide": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "permissions": {
                "contains": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "request": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "runtime": {
                "getBackgroundPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPlatformInfo": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "openOptionsPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "requestUpdateCheck": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "sendMessage": {
                  "minArgs": 1,
                  "maxArgs": 3
                },
                "sendNativeMessage": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "setUninstallURL": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "sessions": {
                "getDevices": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getRecentlyClosed": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "restore": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "storage": {
                "local": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                },
                "managed": {
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  }
                },
                "sync": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                }
              },
              "tabs": {
                "captureVisibleTab": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "detectLanguage": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "discard": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "duplicate": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "executeScript": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getZoom": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getZoomSettings": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goBack": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goForward": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "highlight": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "insertCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "query": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "reload": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "sendMessage": {
                  "minArgs": 2,
                  "maxArgs": 3
                },
                "setZoom": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "setZoomSettings": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "update": {
                  "minArgs": 1,
                  "maxArgs": 2
                }
              },
              "topSites": {
                "get": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "webNavigation": {
                "getAllFrames": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFrame": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "webRequest": {
                "handlerBehaviorChanged": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "windows": {
                "create": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getLastFocused": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              }
            };
            if (Object.keys(apiMetadata).length === 0) {
              throw new Error("api-metadata.json has not been included in browser-polyfill");
            }
            class DefaultWeakMap extends WeakMap {
              constructor(createItem, items = void 0) {
                super(items);
                this.createItem = createItem;
              }
              get(key) {
                if (!this.has(key)) {
                  this.set(key, this.createItem(key));
                }
                return super.get(key);
              }
            }
            const isThenable = (value) => {
              return value && typeof value === "object" && typeof value.then === "function";
            };
            const makeCallback = (promise, metadata) => {
              return (...callbackArgs) => {
                if (extensionAPIs.runtime.lastError) {
                  promise.reject(new Error(extensionAPIs.runtime.lastError.message));
                } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
                  promise.resolve(callbackArgs[0]);
                } else {
                  promise.resolve(callbackArgs);
                }
              };
            };
            const pluralizeArguments = (numArgs) => numArgs == 1 ? "argument" : "arguments";
            const wrapAsyncFunction = (name, metadata) => {
              return function asyncFunctionWrapper(target, ...args) {
                if (args.length < metadata.minArgs) {
                  throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
                }
                if (args.length > metadata.maxArgs) {
                  throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
                }
                return new Promise((resolve, reject) => {
                  if (metadata.fallbackToNoCallback) {
                    try {
                      target[name](...args, makeCallback({
                        resolve,
                        reject
                      }, metadata));
                    } catch (cbError) {
                      console.warn(`${name} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `, cbError);
                      target[name](...args);
                      metadata.fallbackToNoCallback = false;
                      metadata.noCallback = true;
                      resolve();
                    }
                  } else if (metadata.noCallback) {
                    target[name](...args);
                    resolve();
                  } else {
                    target[name](...args, makeCallback({
                      resolve,
                      reject
                    }, metadata));
                  }
                });
              };
            };
            const wrapMethod = (target, method, wrapper) => {
              return new Proxy(method, {
                apply(targetMethod, thisObj, args) {
                  return wrapper.call(thisObj, target, ...args);
                }
              });
            };
            let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
            const wrapObject = (target, wrappers = {}, metadata = {}) => {
              let cache = /* @__PURE__ */ Object.create(null);
              let handlers = {
                has(proxyTarget2, prop) {
                  return prop in target || prop in cache;
                },
                get(proxyTarget2, prop, receiver) {
                  if (prop in cache) {
                    return cache[prop];
                  }
                  if (!(prop in target)) {
                    return void 0;
                  }
                  let value = target[prop];
                  if (typeof value === "function") {
                    if (typeof wrappers[prop] === "function") {
                      value = wrapMethod(target, target[prop], wrappers[prop]);
                    } else if (hasOwnProperty(metadata, prop)) {
                      let wrapper = wrapAsyncFunction(prop, metadata[prop]);
                      value = wrapMethod(target, target[prop], wrapper);
                    } else {
                      value = value.bind(target);
                    }
                  } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
                    value = wrapObject(value, wrappers[prop], metadata[prop]);
                  } else if (hasOwnProperty(metadata, "*")) {
                    value = wrapObject(value, wrappers[prop], metadata["*"]);
                  } else {
                    Object.defineProperty(cache, prop, {
                      configurable: true,
                      enumerable: true,
                      get() {
                        return target[prop];
                      },
                      set(value2) {
                        target[prop] = value2;
                      }
                    });
                    return value;
                  }
                  cache[prop] = value;
                  return value;
                },
                set(proxyTarget2, prop, value, receiver) {
                  if (prop in cache) {
                    cache[prop] = value;
                  } else {
                    target[prop] = value;
                  }
                  return true;
                },
                defineProperty(proxyTarget2, prop, desc) {
                  return Reflect.defineProperty(cache, prop, desc);
                },
                deleteProperty(proxyTarget2, prop) {
                  return Reflect.deleteProperty(cache, prop);
                }
              };
              let proxyTarget = Object.create(target);
              return new Proxy(proxyTarget, handlers);
            };
            const wrapEvent = (wrapperMap) => ({
              addListener(target, listener, ...args) {
                target.addListener(wrapperMap.get(listener), ...args);
              },
              hasListener(target, listener) {
                return target.hasListener(wrapperMap.get(listener));
              },
              removeListener(target, listener) {
                target.removeListener(wrapperMap.get(listener));
              }
            });
            const onRequestFinishedWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onRequestFinished(req) {
                const wrappedReq = wrapObject(req, {}, {
                  getContent: {
                    minArgs: 0,
                    maxArgs: 0
                  }
                });
                listener(wrappedReq);
              };
            });
            const onMessageWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onMessage(message, sender, sendResponse) {
                let didCallSendResponse = false;
                let wrappedSendResponse;
                let sendResponsePromise = new Promise((resolve) => {
                  wrappedSendResponse = function(response) {
                    didCallSendResponse = true;
                    resolve(response);
                  };
                });
                let result;
                try {
                  result = listener(message, sender, wrappedSendResponse);
                } catch (err) {
                  result = Promise.reject(err);
                }
                const isResultThenable = result !== true && isThenable(result);
                if (result !== true && !isResultThenable && !didCallSendResponse) {
                  return false;
                }
                const sendPromisedResult = (promise) => {
                  promise.then((msg) => {
                    sendResponse(msg);
                  }, (error) => {
                    let message2;
                    if (error && (error instanceof Error || typeof error.message === "string")) {
                      message2 = error.message;
                    } else {
                      message2 = "An unexpected error occurred";
                    }
                    sendResponse({
                      __mozWebExtensionPolyfillReject__: true,
                      message: message2
                    });
                  }).catch((err) => {
                    console.error("Failed to send onMessage rejected reply", err);
                  });
                };
                if (isResultThenable) {
                  sendPromisedResult(result);
                } else {
                  sendPromisedResult(sendResponsePromise);
                }
                return true;
              };
            });
            const wrappedSendMessageCallback = ({
              reject,
              resolve
            }, reply) => {
              if (extensionAPIs.runtime.lastError) {
                if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
                  resolve();
                } else {
                  reject(new Error(extensionAPIs.runtime.lastError.message));
                }
              } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
                reject(new Error(reply.message));
              } else {
                resolve(reply);
              }
            };
            const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
              if (args.length < metadata.minArgs) {
                throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
              }
              if (args.length > metadata.maxArgs) {
                throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
              }
              return new Promise((resolve, reject) => {
                const wrappedCb = wrappedSendMessageCallback.bind(null, {
                  resolve,
                  reject
                });
                args.push(wrappedCb);
                apiNamespaceObj.sendMessage(...args);
              });
            };
            const staticWrappers = {
              devtools: {
                network: {
                  onRequestFinished: wrapEvent(onRequestFinishedWrappers)
                }
              },
              runtime: {
                onMessage: wrapEvent(onMessageWrappers),
                onMessageExternal: wrapEvent(onMessageWrappers),
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 1,
                  maxArgs: 3
                })
              },
              tabs: {
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 2,
                  maxArgs: 3
                })
              }
            };
            const settingMetadata = {
              clear: {
                minArgs: 1,
                maxArgs: 1
              },
              get: {
                minArgs: 1,
                maxArgs: 1
              },
              set: {
                minArgs: 1,
                maxArgs: 1
              }
            };
            apiMetadata.privacy = {
              network: {
                "*": settingMetadata
              },
              services: {
                "*": settingMetadata
              },
              websites: {
                "*": settingMetadata
              }
            };
            return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
          };
          module2.exports = wrapAPIs(chrome);
        } else {
          module2.exports = globalThis.browser;
        }
      });
    }
  });

  // src/content/extractors/github.ts
  var github_exports = {};
  __export(github_exports, {
    default: () => github_default
  });
  function extractPR(doc, owner, repo, number) {
    const title = doc.querySelector(".gh-header-title .js-issue-title")?.textContent?.trim() ?? "";
    const author = doc.querySelector(".gh-header-meta .author")?.textContent?.trim() ?? "";
    const state = doc.querySelector(".State")?.textContent?.trim() ?? "";
    const filesChanged = doc.querySelector("#files_tab_counter")?.textContent?.trim() ?? "";
    const checksEl = doc.querySelector(".merge-status-list");
    const checks = checksEl?.textContent?.trim() ?? "";
    const labels = Array.from(doc.querySelectorAll(".IssueLabel")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    const reviewers = Array.from(doc.querySelectorAll(".reviewers-status-icon + .css-truncate")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    return {
      siteName: "GitHub",
      entityType: "pull_request",
      data: {
        owner,
        repo,
        number: parseInt(number, 10),
        title,
        author,
        state,
        filesChanged,
        checks,
        labels,
        reviewers,
        url: location.href
      }
    };
  }
  function extractIssue(doc, owner, repo, number) {
    const title = doc.querySelector(".gh-header-title .js-issue-title")?.textContent?.trim() ?? "";
    const author = doc.querySelector(".gh-header-meta .author")?.textContent?.trim() ?? "";
    const state = doc.querySelector(".State")?.textContent?.trim() ?? "";
    const labels = Array.from(doc.querySelectorAll(".IssueLabel")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    const assignees = Array.from(doc.querySelectorAll(".assignee .css-truncate-target")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    return {
      siteName: "GitHub",
      entityType: "issue",
      data: {
        owner,
        repo,
        number: parseInt(number, 10),
        title,
        author,
        state,
        labels,
        assignees,
        url: location.href
      }
    };
  }
  function extractRepo(doc, owner, repo) {
    const description = doc.querySelector('[itemprop="about"]')?.textContent?.trim() ?? "";
    const stars = doc.querySelector("#repo-stars-counter-star")?.textContent?.trim() ?? "";
    const language = doc.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim() ?? "";
    return {
      siteName: "GitHub",
      entityType: "repository",
      data: {
        owner,
        repo,
        description,
        stars,
        language,
        url: location.href
      }
    };
  }
  var GitHubExtractor, github_default;
  var init_github = __esm({
    "src/content/extractors/github.ts"() {
      "use strict";
      GitHubExtractor = {
        name: "github",
        priority: 10,
        matches(url) {
          return url.hostname === "github.com" || url.hostname.endsWith(".github.com");
        },
        extract(doc) {
          const path = location.pathname;
          const prMatch = path.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
          if (prMatch) {
            return extractPR(doc, prMatch[1], prMatch[2], prMatch[3]);
          }
          const issueMatch = path.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
          if (issueMatch) {
            return extractIssue(doc, issueMatch[1], issueMatch[2], issueMatch[3]);
          }
          const repoMatch = path.match(/^\/([^/]+)\/([^/]+)\/?$/);
          if (repoMatch) {
            return extractRepo(doc, repoMatch[1], repoMatch[2]);
          }
          return null;
        }
      };
      github_default = GitHubExtractor;
    }
  });

  // src/content/extractors/jira.ts
  var jira_exports = {};
  __export(jira_exports, {
    default: () => jira_default
  });
  function extractIssueKeyFromUrl() {
    const match = location.pathname.match(/\/browse\/([A-Z]+-\d+)/);
    return match?.[1] ?? null;
  }
  var JiraExtractor, jira_default;
  var init_jira = __esm({
    "src/content/extractors/jira.ts"() {
      "use strict";
      JiraExtractor = {
        name: "jira",
        priority: 10,
        matches(url) {
          return url.hostname.endsWith(".atlassian.net") || url.hostname.endsWith(".jira.com");
        },
        extract(doc) {
          const issueKey = doc.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')?.textContent?.trim() ?? doc.querySelector("#key-val")?.textContent?.trim() ?? extractIssueKeyFromUrl();
          if (!issueKey) return null;
          const summary = doc.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]')?.textContent?.trim() ?? doc.querySelector("#summary-val")?.textContent?.trim() ?? "";
          const status = doc.querySelector('[data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"] span')?.textContent?.trim() ?? doc.querySelector("#status-val")?.textContent?.trim() ?? "";
          const assignee = doc.querySelector('[data-testid="issue.views.field.user.assignee"] span')?.textContent?.trim() ?? doc.querySelector("#assignee-val")?.textContent?.trim() ?? "Unassigned";
          const priority = doc.querySelector('[data-testid="issue.views.field.priority.priority"] span')?.textContent?.trim() ?? doc.querySelector("#priority-val")?.textContent?.trim() ?? "";
          const issueType = doc.querySelector('[data-testid="issue.views.issue-base.foundation.issue-type.button"] span')?.textContent?.trim() ?? doc.querySelector("#type-val")?.textContent?.trim() ?? "";
          const labels = Array.from(doc.querySelectorAll('[data-testid="issue.views.field.multi-select.labels"] a, .labels .lozenge')).map(
            (el) => el.textContent?.trim() ?? ""
          );
          return {
            siteName: "Jira",
            entityType: "issue",
            data: {
              issueKey,
              summary,
              status,
              assignee,
              priority,
              issueType,
              labels,
              url: location.href
            }
          };
        }
      };
      jira_default = JiraExtractor;
    }
  });

  // src/content/extractors/slack.ts
  var slack_exports = {};
  __export(slack_exports, {
    default: () => slack_default
  });
  var SlackExtractor, slack_default;
  var init_slack = __esm({
    "src/content/extractors/slack.ts"() {
      "use strict";
      SlackExtractor = {
        name: "slack",
        priority: 10,
        matches(url) {
          return url.hostname === "app.slack.com" || url.hostname === "slack.com";
        },
        extract(doc) {
          const channelName = doc.querySelector('[data-qa="channel_name"]')?.textContent?.trim() ?? doc.querySelector(".p-channel_sidebar__name--overflow")?.textContent?.trim() ?? "";
          if (!channelName) return null;
          const topic = doc.querySelector('[data-qa="channel_topic_text"]')?.textContent?.trim() ?? "";
          const workspace = doc.querySelector('[data-qa="team-name"]')?.textContent?.trim() ?? doc.querySelector(".p-ia__sidebar_header__team_name")?.textContent?.trim() ?? "";
          const messageElements = doc.querySelectorAll('[data-qa="virtual-list-item"]');
          const messages = [];
          const visibleMessages = Array.from(messageElements).slice(-10);
          for (const msgEl of visibleMessages) {
            const author = msgEl.querySelector('[data-qa="message_sender_name"]')?.textContent?.trim() ?? "";
            const text = msgEl.querySelector('[data-qa="message-text"]')?.textContent?.trim() ?? "";
            const time = msgEl.querySelector('[data-qa="message_time"]')?.textContent?.trim() ?? "";
            if (text) {
              messages.push({ author, text: text.slice(0, 500), time });
            }
          }
          const isThread = doc.querySelector('[data-qa="thread_messages"]') !== null;
          return {
            siteName: "Slack",
            entityType: "channel",
            data: {
              workspace,
              channelName,
              topic,
              messages,
              isThread,
              messageCount: messages.length,
              url: location.href
            }
          };
        }
      };
      slack_default = SlackExtractor;
    }
  });

  // src/content/index.ts
  var import_webextension_polyfill2 = __toESM(require_browser_polyfill(), 1);

  // src/shared/constants.ts
  var MAX_TEXT_NODES = 5e3;
  var MAX_PAYLOAD_BYTES = 5e5;
  var EXTRACTION_DEBOUNCE_MS = 2e3;
  var EXTRACTION_MAX_INTERVAL_MS = 5e3;

  // src/content/extractor.ts
  var pageLoadTime = Date.now();
  var consoleErrors = [];
  try {
    const originalError = console.error;
    console.error = (...args) => {
      consoleErrors.push(args.map(String).join(" ").slice(0, 200));
      if (consoleErrors.length > 20) consoleErrors.shift();
      originalError.apply(console, args);
    };
    window.addEventListener("error", (e) => {
      consoleErrors.push(`${e.message} at ${e.filename}:${e.lineno}`);
      if (consoleErrors.length > 20) consoleErrors.shift();
    });
    window.addEventListener("unhandledrejection", (e) => {
      consoleErrors.push(`Unhandled rejection: ${String(e.reason).slice(0, 200)}`);
      if (consoleErrors.length > 20) consoleErrors.shift();
    });
  } catch {
  }
  function resetPageTimer() {
    pageLoadTime = Date.now();
    consoleErrors = [];
  }
  function extractPage(tabId2) {
    const content = extractTextContent();
    const meta = extractMeta();
    const hasPasswordField = document.querySelector('input[type="password"]') !== null;
    const hasCreditCardField = document.querySelector('input[autocomplete="cc-number"]') !== null || document.querySelector('input[autocomplete="cc-exp"]') !== null || document.querySelector('input[autocomplete="cc-csc"]') !== null || document.querySelector('input[name*="card" i]') !== null;
    const snapshot = {
      tabId: tabId2,
      url: location.href,
      title: document.title,
      content,
      siteData: null,
      meta,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      // Rich context signals
      scrollDepth: getScrollDepth(),
      timeOnPageMs: Date.now() - pageLoadTime,
      isTabFocused: document.hasFocus(),
      visibleText: extractVisibleText(),
      links: extractLinks(),
      images: extractImages(),
      formData: extractFormData(hasPasswordField),
      pageLoadMs: getPageLoadTime(),
      consoleErrors: [...consoleErrors]
    };
    return { snapshot, hasPasswordField, hasCreditCardField };
  }
  function getScrollDepth() {
    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0
    );
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    if (scrollHeight <= viewportHeight) return 1;
    return Math.min(1, (scrollTop + viewportHeight) / scrollHeight);
  }
  function extractVisibleText() {
    const parts = [];
    const walker = document.createTreeWalker(
      document.body ?? document.documentElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          const rect = parent.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let len = 0;
    while (walker.nextNode() && len < 5e4) {
      const text = walker.currentNode.textContent?.trim();
      if (text) {
        parts.push(text);
        len += text.length;
      }
    }
    return parts.join(" ").slice(0, 5e4);
  }
  function extractLinks() {
    const links = [];
    const seen = /* @__PURE__ */ new Set();
    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      if (links.length >= 50) break;
      const anchor = a;
      const href = anchor.href;
      if (!href || href.startsWith("javascript:") || seen.has(href)) continue;
      seen.add(href);
      let isExternal = false;
      try {
        isExternal = new URL(href).hostname !== location.hostname;
      } catch {
      }
      links.push({
        href,
        text: anchor.textContent?.trim().slice(0, 100) ?? "",
        isExternal
      });
    }
    return links;
  }
  function extractImages() {
    const images = [];
    const imgElements = document.querySelectorAll("img[src]");
    for (const img of imgElements) {
      if (images.length >= 20) break;
      const imgEl = img;
      if (!imgEl.src || imgEl.width < 50 || imgEl.height < 50) continue;
      images.push({
        src: imgEl.src,
        alt: imgEl.alt ?? "",
        width: imgEl.naturalWidth || imgEl.width,
        height: imgEl.naturalHeight || imgEl.height
      });
    }
    return images;
  }
  function extractFormData(hasPasswordField) {
    const fields = [];
    const inputs = document.querySelectorAll("input, select, textarea");
    for (const input of inputs) {
      if (fields.length >= 30) break;
      const el = input;
      if (el instanceof HTMLInputElement) {
        if (el.type === "password" || el.type === "hidden") continue;
        if (el.autocomplete?.includes("cc-")) continue;
      }
      if (!el.value) continue;
      let label = null;
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        label = labelEl?.textContent?.trim().slice(0, 50) ?? null;
      }
      if (!label && el.getAttribute("aria-label")) {
        label = el.getAttribute("aria-label");
      }
      if (!label && el.getAttribute("placeholder")) {
        label = el.getAttribute("placeholder");
      }
      let value = el.value.slice(0, 200);
      if (hasPasswordField && el instanceof HTMLInputElement && el.type === "text") {
        value = "[redacted]";
      }
      fields.push({
        name: el.name || el.id || "",
        type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
        value,
        label
      });
    }
    return fields;
  }
  function getPageLoadTime() {
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) {
        return Math.round(nav.loadEventEnd - nav.startTime);
      }
    } catch {
    }
    return 0;
  }
  function extractTextContent() {
    if (!document.body) return "";
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEMPLATE") {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node.textContent?.trim();
          if (!text) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const parts = [];
    let nodeCount = 0;
    let totalLength = 0;
    while (walker.nextNode()) {
      if (nodeCount >= MAX_TEXT_NODES) break;
      if (totalLength >= MAX_PAYLOAD_BYTES) break;
      const text = walker.currentNode.textContent?.trim();
      if (text) {
        parts.push(text);
        totalLength += text.length;
        nodeCount++;
      }
    }
    let result = parts.join(" ");
    if (result.length > MAX_PAYLOAD_BYTES) {
      result = result.slice(0, MAX_PAYLOAD_BYTES);
    }
    return result;
  }
  function extractMeta() {
    const getMeta = (property) => {
      const el = document.querySelector(`meta[property="${property}"]`) ?? document.querySelector(`meta[name="${property}"]`);
      return el?.getAttribute("content") ?? null;
    };
    return {
      ogTitle: getMeta("og:title"),
      ogDescription: getMeta("og:description") ?? getMeta("description"),
      ogImage: getMeta("og:image"),
      charset: document.characterSet ?? null,
      lang: document.documentElement.lang ?? null
    };
  }

  // src/content/mutation-watcher.ts
  var MutationWatcher = class {
    observer = null;
    callback;
    debounceTimer = null;
    lastExtractionTime = 0;
    isRunning = false;
    constructor(callback) {
      this.callback = callback;
    }
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.observer = new MutationObserver((mutations) => {
        if (this.hasMeaningfulChange(mutations)) {
          this.scheduleExtraction();
        }
      });
      this.observer.observe(document.body ?? document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
        // NOT observing attributes — class/style changes aren't meaningful content changes
      });
      this.watchHistoryApi();
    }
    stop() {
      this.isRunning = false;
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
    /**
     * Filter out noise mutations (style changes, class toggles, ad injections).
     * Only trigger on actual text content changes.
     */
    hasMeaningfulChange(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          return true;
        }
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (this.nodeHasText(node)) return true;
          }
          for (const node of mutation.removedNodes) {
            if (this.nodeHasText(node)) return true;
          }
        }
      }
      return false;
    }
    /** Check if a node (or its children) contains non-trivial text */
    nodeHasText(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent?.trim().length ?? 0) > 0;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node;
        const tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "LINK" || tag === "META") {
          return false;
        }
        return (el.textContent?.trim().length ?? 0) > 10;
      }
      return false;
    }
    /**
     * Debounce extraction: wait EXTRACTION_DEBOUNCE_MS after last mutation.
     * Cap: at most one extraction per EXTRACTION_MAX_INTERVAL_MS.
     */
    scheduleExtraction() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        const now = Date.now();
        const timeSinceLastExtraction = now - this.lastExtractionTime;
        if (timeSinceLastExtraction >= EXTRACTION_MAX_INTERVAL_MS) {
          this.lastExtractionTime = now;
          this.callback();
        } else {
          const delay = EXTRACTION_MAX_INTERVAL_MS - timeSinceLastExtraction;
          this.debounceTimer = setTimeout(() => {
            this.lastExtractionTime = Date.now();
            this.callback();
          }, delay);
        }
      }, EXTRACTION_DEBOUNCE_MS);
    }
    /** Watch for SPA navigation via History API (pushState/replaceState/popstate) */
    watchHistoryApi() {
      window.addEventListener("popstate", () => {
        this.scheduleExtraction();
      });
      const originalPushState = history.pushState.bind(history);
      const originalReplaceState = history.replaceState.bind(history);
      history.pushState = (...args) => {
        originalPushState(...args);
        this.scheduleExtraction();
      };
      history.replaceState = (...args) => {
        originalReplaceState(...args);
        this.scheduleExtraction();
      };
    }
  };

  // src/content/recorder-hooks.ts
  var RecorderHooks = class {
    callback;
    tabId;
    isRecording = false;
    scrollTimer = null;
    lastScrollEmit = 0;
    constructor(tabId2, callback) {
      this.tabId = tabId2;
      this.callback = callback;
    }
    start() {
      if (this.isRecording) return;
      this.isRecording = true;
      document.addEventListener("click", this.handleClick, { capture: true, passive: true });
      document.addEventListener("submit", this.handleSubmit, { capture: true, passive: true });
      document.addEventListener("change", this.handleChange, { capture: true, passive: true });
      document.addEventListener("copy", this.handleCopy, { capture: true, passive: true });
      document.addEventListener("paste", this.handlePaste, { capture: true, passive: true });
      window.addEventListener("scroll", this.handleScroll, { passive: true });
      window.addEventListener("focus", this.handleFocus);
      window.addEventListener("blur", this.handleBlur);
    }
    stop() {
      this.isRecording = false;
      document.removeEventListener("click", this.handleClick, { capture: true });
      document.removeEventListener("submit", this.handleSubmit, { capture: true });
      document.removeEventListener("change", this.handleChange, { capture: true });
      document.removeEventListener("copy", this.handleCopy, { capture: true });
      document.removeEventListener("paste", this.handlePaste, { capture: true });
      window.removeEventListener("scroll", this.handleScroll);
      window.removeEventListener("focus", this.handleFocus);
      window.removeEventListener("blur", this.handleBlur);
      if (this.scrollTimer) clearTimeout(this.scrollTimer);
    }
    /** Update tab ID (set by service worker after content script ready) */
    setTabId(id) {
      this.tabId = id;
    }
    handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const interactiveTags = /* @__PURE__ */ new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]);
      const clickableEl = target.closest('a, button, [role="button"], [onclick]');
      if (!interactiveTags.has(target.tagName) && !clickableEl) return;
      const el = clickableEl ?? target;
      this.emit("click", el, null);
    };
    handleSubmit = (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      this.emit("submit", form, null);
    };
    handleChange = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (target instanceof HTMLInputElement && target.type === "password") return;
      let value;
      if (target instanceof HTMLInputElement && target.type === "checkbox") {
        value = String(target.checked);
      } else if (target instanceof HTMLInputElement && (target.type === "search" || target.name.includes("search") || target.name.includes("query") || target.name.includes("filter"))) {
        value = target.value.slice(0, 200);
      } else if (target instanceof HTMLSelectElement) {
        value = target.options[target.selectedIndex]?.text ?? target.value;
      } else {
        value = "[changed]";
      }
      this.emit("input", target, value);
    };
    handleCopy = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim().slice(0, 500) ?? "";
      if (!text) return;
      this.emit("copy", document.body, text);
    };
    handlePaste = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      this.emit("paste", target, "[pasted]");
    };
    /** Debounced scroll tracking — emit at most once per 3 seconds */
    handleScroll = () => {
      if (this.scrollTimer) return;
      const now = Date.now();
      if (now - this.lastScrollEmit < 3e3) return;
      this.scrollTimer = setTimeout(() => {
        this.scrollTimer = null;
        this.lastScrollEmit = Date.now();
        const scrollHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0
        );
        const viewportHeight = window.innerHeight;
        const scrollTop = window.scrollY;
        const depth = scrollHeight <= viewportHeight ? 1 : Math.min(1, (scrollTop + viewportHeight) / scrollHeight);
        this.emit("scroll", document.body, `${Math.round(depth * 100)}%`);
      }, 1e3);
    };
    handleFocus = () => {
      this.emit("focus", document.body, "tab_focused");
    };
    handleBlur = () => {
      this.emit("blur", document.body, "tab_blurred");
    };
    emit(type, element, value) {
      if (!this.isRecording) return;
      const action = {
        type,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        tabId: this.tabId,
        url: location.href,
        target: {
          selector: this.getSelector(element),
          tagName: element.tagName.toLowerCase(),
          text: element.textContent?.trim().slice(0, 100) ?? null,
          href: element instanceof HTMLAnchorElement ? element.href : null
        },
        value
      };
      this.callback(action);
    }
    getSelector(el) {
      if (el.id) return `#${CSS.escape(el.id)}`;
      const tag = el.tagName.toLowerCase();
      const classes = Array.from(el.classList).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join("");
      if (classes) return `${tag}${classes}`;
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(el) + 1;
        return `${tag}:nth-child(${index})`;
      }
      return tag;
    }
  };

  // src/content/extractors/registry.ts
  var EXTRACTOR_REGISTRY = [
    {
      name: "github",
      matches: (url) => url.hostname === "github.com" || url.hostname.endsWith(".github.com"),
      load: async () => {
        const mod = await Promise.resolve().then(() => (init_github(), github_exports));
        return mod.default;
      },
      priority: 10
    },
    {
      name: "jira",
      matches: (url) => url.hostname.endsWith(".atlassian.net") || url.hostname.endsWith(".jira.com"),
      load: async () => {
        const mod = await Promise.resolve().then(() => (init_jira(), jira_exports));
        return mod.default;
      },
      priority: 10
    },
    {
      name: "slack",
      matches: (url) => url.hostname === "app.slack.com" || url.hostname === "slack.com",
      load: async () => {
        const mod = await Promise.resolve().then(() => (init_slack(), slack_exports));
        return mod.default;
      },
      priority: 10
    }
  ];
  async function extractSiteData(url) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return null;
    }
    const sorted = [...EXTRACTOR_REGISTRY].sort((a, b) => b.priority - a.priority);
    for (const entry of sorted) {
      if (entry.matches(parsedUrl)) {
        try {
          const extractor = await entry.load();
          return extractor.extract(document);
        } catch (e) {
          console.warn(`[ExtractorRegistry] ${entry.name} extractor failed:`, e);
          return null;
        }
      }
    }
    return null;
  }

  // src/content/debug-overlay.ts
  var import_webextension_polyfill = __toESM(require_browser_polyfill(), 1);
  var OVERLAY_ID = "openclaw-debug-overlay-style";
  var BANNER_ID = "openclaw-status-bar";
  var OVERLAY_CSS = `
  #${BANNER_ID} {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: rgba(15, 23, 42, 0.92);
    color: #94a3b8;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 12px;
    z-index: 2147483647;
    border-top: 1px solid rgba(51, 65, 85, 0.6);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: opacity 0.2s;
  }
  #${BANNER_ID} .oc-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  #${BANNER_ID} .oc-dot.streaming { background: #10b981; box-shadow: 0 0 6px #10b981; }
  #${BANNER_ID} .oc-dot.blocked   { background: #ef4444; }
  #${BANNER_ID} .oc-dot.offline   { background: #6b7280; }
  #${BANNER_ID} .oc-label {
    color: #e2e8f0;
    font-weight: 500;
  }
  #${BANNER_ID} .oc-domain {
    color: #64748b;
  }
  #${BANNER_ID} .oc-right {
    margin-left: auto;
    color: #475569;
  }
  #${BANNER_ID} .oc-allow-btn {
    pointer-events: auto;
    cursor: pointer;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.4);
    border-radius: 4px;
    padding: 2px 10px;
    font-size: 10px;
    font-weight: 600;
    font-family: inherit;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.15s;
    margin-left: 8px;
  }
  #${BANNER_ID} .oc-allow-btn:hover {
    background: rgba(16, 185, 129, 0.3);
    border-color: #10b981;
    color: #fff;
  }
  #${BANNER_ID} .oc-block-btn {
    pointer-events: auto;
    cursor: pointer;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    padding: 2px 10px;
    font-size: 10px;
    font-weight: 600;
    font-family: inherit;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.15s;
    margin-left: 8px;
  }
  #${BANNER_ID} .oc-block-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: #ef4444;
    color: #fff;
  }
`;
  var currentState = {
    isStreaming: false,
    isConnected: false,
    domain: ""
  };
  function ensureInjected() {
    if (document.getElementById(OVERLAY_ID)) return;
    const style = document.createElement("style");
    style.id = OVERLAY_ID;
    style.textContent = OVERLAY_CSS;
    (document.head ?? document.documentElement).appendChild(style);
  }
  function sendAllowDomain() {
    try {
      import_webextension_polyfill.default.runtime.sendMessage({
        type: "TEACH_DOMAIN",
        domain: currentState.domain,
        isWorkTool: true
      });
    } catch {
    }
  }
  function sendBlockDomain() {
    try {
      import_webextension_polyfill.default.runtime.sendMessage({
        type: "TEACH_DOMAIN",
        domain: currentState.domain,
        isWorkTool: false
      });
    } catch {
    }
  }
  function render() {
    ensureInjected();
    let banner = document.getElementById(BANNER_ID);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = BANNER_ID;
      (document.body ?? document.documentElement).appendChild(banner);
    }
    const { isStreaming, isConnected, domain, tabCount } = currentState;
    const dotClass = !isConnected ? "offline" : isStreaming ? "streaming" : "blocked";
    const statusText = !isConnected ? "Disconnected" : isStreaming ? "Streaming" : "Blocked";
    const logo = "\u{1F99E}";
    const tabInfo = tabCount !== void 0 ? `${tabCount} tabs` : "";
    let actionButton = "";
    if (isConnected && !isStreaming) {
      actionButton = `<button class="oc-allow-btn" id="oc-allow-btn">Allow</button>`;
    } else if (isConnected && isStreaming) {
      actionButton = `<button class="oc-block-btn" id="oc-block-btn">Block</button>`;
    }
    banner.innerHTML = `
    <span class="oc-label">${logo} OpenClaw</span>
    <span class="oc-dot ${dotClass}"></span>
    <span class="oc-label">${statusText}</span>
    <span class="oc-domain">${domain}</span>
    ${actionButton}
    <span class="oc-right">${tabInfo}</span>
  `;
    const allowBtn = document.getElementById("oc-allow-btn");
    if (allowBtn) {
      allowBtn.addEventListener("click", sendAllowDomain);
    }
    const blockBtn = document.getElementById("oc-block-btn");
    if (blockBtn) {
      blockBtn.addEventListener("click", sendBlockDomain);
    }
  }
  function updateOverlay(state) {
    currentState = { ...currentState, ...state };
    render();
  }
  function initOverlay() {
    try {
      currentState.domain = location.hostname;
    } catch {
      currentState.domain = "";
    }
    render();
  }

  // src/content/index.ts
  var tabId = -1;
  var recorder = null;
  function sendToBackground(message) {
    try {
      import_webextension_polyfill2.default.runtime.sendMessage(message);
    } catch {
    }
  }
  async function performExtraction() {
    if (tabId === -1) return;
    const { snapshot, hasPasswordField, hasCreditCardField } = extractPage(tabId);
    try {
      const siteData = await extractSiteData(location.href);
      if (siteData) {
        snapshot.siteData = siteData;
      }
    } catch {
    }
    const message = {
      type: "PAGE_SNAPSHOT",
      tabId,
      snapshot: {
        ...snapshot,
        // Pack sensitivity signals into a convention the SW understands
        // The SW classifier uses these to make classification decisions
        meta: {
          ...snapshot.meta,
          // @ts-expect-error — extending meta with classifier hints
          _hasPasswordField: hasPasswordField,
          _hasCreditCardField: hasCreditCardField
        }
      }
    };
    sendToBackground(message);
  }
  function onUserAction(action) {
    sendToBackground({
      type: "USER_ACTION",
      tabId,
      action
    });
  }
  function handleMessage(message) {
    if (!message || typeof message !== "object") return;
    const msg = message;
    switch (msg["type"]) {
      case "OVERLAY_UPDATE":
        updateOverlay({
          isStreaming: Boolean(msg["isStreaming"]),
          isConnected: Boolean(msg["isConnected"]),
          domain: String(msg["domain"] ?? location.hostname),
          tabCount: typeof msg["tabCount"] === "number" ? msg["tabCount"] : void 0
        });
        break;
      case "REQUEST_SNAPSHOT":
        performExtraction();
        break;
      case "SET_TAB_ID":
        tabId = Number(msg["tabId"]);
        recorder?.setTabId(tabId);
        resetPageTimer();
        break;
    }
  }
  function init() {
    initOverlay();
    import_webextension_polyfill2.default.runtime.onMessage.addListener((message) => {
      handleMessage(message);
    });
    sendToBackground({
      type: "CONTENT_SCRIPT_READY",
      tabId: -1,
      // Will be filled in by SW
      url: location.href
    });
    const watcher = new MutationWatcher(() => {
      performExtraction();
    });
    if (document.body) {
      watcher.start();
    } else {
      document.addEventListener("DOMContentLoaded", () => watcher.start());
    }
    recorder = new RecorderHooks(tabId, onUserAction);
    if (document.body) {
      recorder.start();
    } else {
      document.addEventListener("DOMContentLoaded", () => recorder?.start());
    }
    setTimeout(() => performExtraction(), 500);
    document.addEventListener("mouseup", () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        try {
          import_webextension_polyfill2.default.storage.session.set({
            [`selection_${tabId}`]: {
              text: selection.toString(),
              context: selection.anchorNode?.parentElement?.textContent?.slice(0, 500) ?? ""
            }
          });
        } catch {
        }
      }
    });
  }
  init();
})();
//# sourceMappingURL=index.js.map
