var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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
              } catch (err2) {
                result = Promise.reject(err2);
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
                }).catch((err2) => {
                  console.error("Failed to send onMessage rejected reply", err2);
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

// src/shared/result.ts
function ok(value) {
  return { ok: true, value };
}
function err(error) {
  return { ok: false, error };
}

// src/shared/constants.ts
var RECONNECT_BASE_MS = 1e3;
var RECONNECT_MAX_MS = 6e4;
var KEEPALIVE_INTERVAL_MS = 25e3;
var AUTH_TIMEOUT_MS = 6e4;
var BACKGROUND_PING_INTERVAL_MS = 3e4;
var OFFLINE_QUEUE_MAX_BYTES = 8e6;
var OFFLINE_QUEUE_ITEM_TTL_MS = 36e5;
var AUDIT_LOG_MAX_ENTRIES = 1e3;
var DEFAULT_MAX_RATE_PER_MINUTE = 12;
var PROTOCOL_VERSION = "1.0";
var EXTENSION_VERSION = "0.1.0";

// src/shared/protocol.ts
function createMessageId() {
  return crypto.randomUUID();
}
function createEnvelope(type) {
  return {
    protocol_version: PROTOCOL_VERSION,
    type,
    id: createMessageId(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function createContextUpdate(sessionId2, sequence2, payload) {
  return {
    ...createEnvelope("context_update"),
    type: "context_update",
    session_id: sessionId2,
    sequence: sequence2,
    extension_version: EXTENSION_VERSION,
    payload
  };
}
function createPing() {
  return {
    ...createEnvelope("ping"),
    type: "ping"
  };
}

// src/background/connection.ts
var ConnectionManager = class {
  ws = null;
  status = "disconnected";
  auth = null;
  listener;
  reconnectAttempt = 0;
  reconnectTimer = null;
  keepaliveTimer = null;
  reconnectLock = false;
  constructor(listener) {
    this.listener = listener;
  }
  getStatus() {
    return this.status;
  }
  connect(auth) {
    this.auth = auth;
    this.reconnectAttempt = 0;
    this.doConnect();
  }
  disconnect() {
    this.clearTimers();
    this.reconnectLock = false;
    this.reconnectAttempt = 0;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return err(new Error("WebSocket not connected"));
    }
    try {
      this.ws.send(JSON.stringify(message));
      return ok(void 0);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  isConnected() {
    return this.status === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }
  doConnect() {
    if (this.reconnectLock) return;
    if (!this.auth) return;
    this.reconnectLock = true;
    this.setStatus(this.reconnectAttempt === 0 ? "connecting" : "reconnecting");
    const wsUrl = this.buildWsUrl(this.auth.instanceUrl, this.auth.token);
    try {
      this.ws = new WebSocket(wsUrl, ["openclaw-context-v1"]);
    } catch (e) {
      this.reconnectLock = false;
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.reconnectLock = false;
      this.reconnectAttempt = 0;
      this.setStatus("connected");
      this.startKeepalive();
    };
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data));
        if (message.type === "pong") return;
        this.listener.onMessage(message);
      } catch {
        console.warn("[ConnectionManager] Malformed message from server:", event.data);
      }
    };
    this.ws.onclose = () => {
      this.reconnectLock = false;
      this.stopKeepalive();
      this.ws = null;
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
    };
  }
  scheduleReconnect() {
    if (!this.auth) {
      this.setStatus("disconnected");
      return;
    }
    this.setStatus("reconnecting");
    this.reconnectAttempt++;
    const baseDelay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt - 1),
      RECONNECT_MAX_MS
    );
    const jitter = Math.random() * baseDelay;
    const delay = baseDelay + jitter;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, delay);
  }
  startKeepalive() {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send(createPing());
      }
    }, KEEPALIVE_INTERVAL_MS);
  }
  stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
  clearTimers() {
    this.stopKeepalive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  setStatus(status) {
    if (this.status !== status) {
      this.status = status;
      this.listener.onStatusChange(status);
    }
  }
  buildWsUrl(instanceUrl, token) {
    const url = new URL(instanceUrl);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${url.host}/ws/extension?token=${encodeURIComponent(token)}`;
  }
};

// src/background/auth.ts
var AuthManager = class {
  platform;
  listener;
  refreshTimer = null;
  constructor(platform2, listener) {
    this.platform = platform2;
    this.listener = listener;
  }
  /** Load stored auth state on startup */
  async loadStored() {
    const stored = await this.platform.persistentStorage.get("auth");
    if (!stored) return null;
    if (stored.method === "oauth" && stored.expiresAt && Date.now() > stored.expiresAt) {
      if (stored.refreshToken) {
        const refreshed = await this.refreshOAuthToken(stored);
        if (refreshed.ok) return refreshed.value;
      }
      await this.clearAuth();
      return null;
    }
    this.scheduleRefresh(stored);
    return stored;
  }
  /** Start OAuth flow with OpenClaw Cloud */
  async startOAuth(instanceUrl) {
    const oauthUrl = `${instanceUrl}/oauth/authorize?client_id=openclaw-extension&response_type=code&redirect_uri=${encodeURIComponent(instanceUrl + "/oauth/callback")}`;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(err(new Error("OAuth flow timed out after 60 seconds")));
      }, AUTH_TIMEOUT_MS);
      if (typeof chrome !== "undefined" && chrome.identity) {
        chrome.identity.launchWebAuthFlow(
          { url: oauthUrl, interactive: true },
          async (redirectUrl) => {
            clearTimeout(timeout);
            if (!redirectUrl) {
              resolve(err(new Error("OAuth flow cancelled by user")));
              return;
            }
            const result = await this.handleOAuthCallback(redirectUrl, instanceUrl);
            resolve(result);
          }
        );
      } else {
        clearTimeout(timeout);
        resolve(err(new Error("OAuth not yet implemented for Firefox \u2014 use API key")));
      }
    });
  }
  /** Validate and store an API key */
  async startApiKey(instanceUrl, apiKey) {
    if (!apiKey || apiKey.trim().length === 0) {
      return err(new Error("API key cannot be empty"));
    }
    if (!instanceUrl || instanceUrl.trim().length === 0) {
      return err(new Error("Instance URL cannot be empty"));
    }
    try {
      new URL(instanceUrl);
    } catch {
      return err(new Error("Invalid instance URL format"));
    }
    const validation = await this.validateApiKey(instanceUrl, apiKey);
    if (!validation.ok) return validation;
    const auth = {
      method: "api_key",
      token: apiKey,
      instanceUrl,
      expiresAt: null,
      refreshToken: null
    };
    await this.storeAuth(auth);
    return ok(auth);
  }
  /** Clear stored auth and disconnect */
  async clearAuth() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    await this.platform.persistentStorage.remove("auth");
    this.listener.onAuthChange(null);
  }
  async handleOAuthCallback(redirectUrl, instanceUrl) {
    try {
      const url = new URL(redirectUrl);
      const code = url.searchParams.get("code");
      if (!code) {
        return err(new Error("No authorization code in OAuth callback"));
      }
      const response = await fetch(`${instanceUrl}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: "openclaw-extension",
          redirect_uri: `${instanceUrl}/oauth/callback`
        })
      });
      if (!response.ok) {
        return err(new Error(`OAuth token exchange failed: ${response.status}`));
      }
      const data = await response.json();
      const auth = {
        method: "oauth",
        token: data.access_token,
        instanceUrl,
        expiresAt: Date.now() + data.expires_in * 1e3,
        refreshToken: data.refresh_token
      };
      await this.storeAuth(auth);
      this.scheduleRefresh(auth);
      return ok(auth);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  async refreshOAuthToken(auth) {
    if (!auth.refreshToken) {
      return err(new Error("No refresh token available"));
    }
    try {
      const response = await fetch(`${auth.instanceUrl}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: auth.refreshToken,
          client_id: "openclaw-extension"
        })
      });
      if (!response.ok) {
        return err(new Error(`Token refresh failed: ${response.status}`));
      }
      const data = await response.json();
      const newAuth = {
        method: "oauth",
        token: data.access_token,
        instanceUrl: auth.instanceUrl,
        expiresAt: Date.now() + data.expires_in * 1e3,
        refreshToken: data.refresh_token
      };
      await this.storeAuth(newAuth);
      this.scheduleRefresh(newAuth);
      return ok(newAuth);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  async validateApiKey(instanceUrl, apiKey) {
    try {
      const response = await fetch(`${instanceUrl}/api/health`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (response.status === 401 || response.status === 403) {
        return err(new Error("API key is invalid or revoked"));
      }
      if (!response.ok) {
        return err(new Error(`OpenClaw instance returned ${response.status}`));
      }
      return ok(void 0);
    } catch (e) {
      if (e instanceof TypeError && String(e).includes("fetch")) {
        return err(new Error("Cannot reach OpenClaw instance \u2014 check the URL"));
      }
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  async storeAuth(auth) {
    await this.platform.persistentStorage.set("auth", auth);
    this.listener.onAuthChange(auth);
  }
  scheduleRefresh(auth) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (auth.method !== "oauth" || !auth.expiresAt) return;
    const refreshIn = auth.expiresAt - Date.now() - 5 * 60 * 1e3;
    if (refreshIn <= 0) return;
    this.refreshTimer = setTimeout(async () => {
      const result = await this.refreshOAuthToken(auth);
      if (!result.ok) {
        await this.clearAuth();
      }
    }, refreshIn);
  }
};

// src/background/tab-registry.ts
var TabRegistry = class {
  tabs = /* @__PURE__ */ new Map();
  activeTabId = null;
  getAll() {
    return Array.from(this.tabs.values());
  }
  get(tabId) {
    return this.tabs.get(tabId);
  }
  getActiveTabId() {
    return this.activeTabId;
  }
  getActiveTab() {
    if (this.activeTabId === null) return void 0;
    return this.tabs.get(this.activeTabId);
  }
  /** Register or update a tab */
  upsert(tabId, url, title, classification) {
    const existing = this.tabs.get(tabId);
    this.tabs.set(tabId, {
      tabId,
      url,
      title,
      isActive: this.activeTabId === tabId,
      classification,
      lastSnapshot: existing?.lastSnapshot ?? null,
      lastUpdateTime: Date.now()
    });
  }
  /** Mark a tab as active, all others as background */
  activate(tabId) {
    if (this.activeTabId !== null) {
      const prev = this.tabs.get(this.activeTabId);
      if (prev) {
        prev.isActive = false;
      }
    }
    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.isActive = true;
    }
  }
  /** Remove a tab from the registry */
  remove(tabId) {
    this.tabs.delete(tabId);
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
    }
  }
  /** Update the last snapshot content for diffing */
  updateSnapshot(tabId, content) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.lastSnapshot = content;
      tab.lastUpdateTime = Date.now();
    }
  }
  /** Get all background (non-active) tabs for ping */
  getBackgroundTabs() {
    return Array.from(this.tabs.values()).filter(
      (t) => !t.isActive && t.classification.classification === "allowed"
    );
  }
  /** Get count of tabs by classification */
  getCounts() {
    let allowed = 0;
    let blocked = 0;
    let unknown = 0;
    for (const tab of this.tabs.values()) {
      switch (tab.classification.classification) {
        case "allowed":
          allowed++;
          break;
        case "blocked":
          blocked++;
          break;
        default:
          unknown++;
      }
    }
    return { allowed, blocked, unknown, total: this.tabs.size };
  }
  /** Serialize for persistence (Chrome SW death recovery) */
  serialize() {
    return JSON.stringify({
      tabs: Array.from(this.tabs.entries()),
      activeTabId: this.activeTabId
    });
  }
  /** Restore from persistence */
  deserialize(data) {
    try {
      const parsed = JSON.parse(data);
      this.tabs = new Map(parsed.tabs);
      this.activeTabId = parsed.activeTabId;
    } catch {
      this.tabs.clear();
      this.activeTabId = null;
    }
  }
};

// src/background/classifier.ts
var KNOWN_ALLOW_DOMAINS = /* @__PURE__ */ new Set([
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "atlassian.net",
  "linear.app",
  "notion.so",
  "slack.com",
  "app.slack.com",
  "discord.com",
  "stackoverflow.com",
  "docs.google.com",
  "sheets.google.com",
  "drive.google.com",
  "console.cloud.google.com",
  "console.aws.amazon.com",
  "portal.azure.com",
  "app.datadog.com",
  "app.sentry.io",
  "vercel.com",
  "netlify.com",
  "render.com",
  "railway.app",
  "fly.io",
  "heroku.com",
  // confluence.atlassian.net covered by atlassian.net above
  "figma.com",
  "trello.com",
  "asana.com",
  "monday.com",
  "clickup.com"
]);
var KNOWN_BLOCK_DOMAINS = /* @__PURE__ */ new Set([
  // Banking
  "chase.com",
  "wellsfargo.com",
  "bankofamerica.com",
  "citi.com",
  "capitalone.com",
  "usbank.com",
  "ally.com",
  "schwab.com",
  "fidelity.com",
  "vanguard.com",
  "tdameritrade.com",
  "robinhood.com",
  "coinbase.com",
  "paypal.com",
  "venmo.com",
  // Medical
  "mychart.com",
  "patient.portal",
  "healthgrades.com",
  // Password managers
  "1password.com",
  "bitwarden.com",
  "lastpass.com",
  "dashlane.com",
  "keepersecurity.com",
  // OAuth / Sign-in
  "accounts.google.com",
  "login.microsoftonline.com",
  "auth0.com",
  "clerk.dev",
  "clerk.com",
  "login.okta.com",
  "sso.google.com",
  // Email (personal)
  "mail.google.com",
  "outlook.live.com",
  "mail.yahoo.com",
  // Social (personal)
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "reddit.com"
]);
var BLOCK_DOMAIN_PATTERNS = [
  /bank/i,
  /credit/i,
  /loan/i,
  /mortgage/i,
  /insurance/i,
  /health/i,
  /medical/i,
  /patient/i,
  /pharmacy/i,
  /tax/i
];
var SENSITIVE_CONTENT_SIGNALS = [
  'input[type="password"]',
  'input[type="credit-card"]',
  'input[autocomplete="cc-number"]',
  'input[autocomplete="cc-exp"]',
  'input[autocomplete="cc-csc"]'
];
var PRIVILEGED_PROTOCOLS = /* @__PURE__ */ new Set(["chrome:", "chrome-extension:", "moz-extension:", "about:", "data:", "file:", "blob:"]);
var Classifier = class {
  platform;
  userOverrides = /* @__PURE__ */ new Map();
  constructor(platform2) {
    this.platform = platform2;
  }
  /** Load user overrides from storage */
  async loadOverrides() {
    const stored = await this.platform.persistentStorage.get("classifierOverrides");
    if (stored) {
      this.userOverrides = new Map(Object.entries(stored));
    }
  }
  /** Save user override for a domain */
  async setOverride(domain, classification) {
    this.userOverrides.set(domain, classification);
    await this.platform.persistentStorage.set(
      "classifierOverrides",
      Object.fromEntries(this.userOverrides)
    );
  }
  /** Teach OpenClaw about a domain */
  async teachDomain(domain, isWorkTool) {
    await this.setOverride(domain, isWorkTool ? "allowed" : "blocked");
  }
  /**
   * Classify a URL. This is the single source of truth for classification.
   *
   * @param url - The page URL
   * @param hasPasswordField - Whether the page contains a password input
   * @param hasCreditCardField - Whether the page contains credit card inputs
   */
  classify(url, hasPasswordField = false, hasCreditCardField = false) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        classification: "blocked",
        source: "default_block",
        domain: url,
        reason: "Invalid URL"
      };
    }
    if (PRIVILEGED_PROTOCOLS.has(parsedUrl.protocol)) {
      return {
        classification: "blocked",
        source: "default_block",
        domain: parsedUrl.hostname,
        reason: `Privileged protocol: ${parsedUrl.protocol}`
      };
    }
    const domain = parsedUrl.hostname;
    const baseDomain = this.getBaseDomain(domain);
    const override = this.userOverrides.get(domain) ?? this.userOverrides.get(baseDomain);
    if (override) {
      return {
        classification: override,
        source: "user_override",
        domain,
        reason: `User set ${domain} to ${override}`
      };
    }
    if (this.matchesDomainSet(domain, KNOWN_ALLOW_DOMAINS)) {
      return {
        classification: "allowed",
        source: "known_allow_list",
        domain,
        reason: `Known work tool: ${domain}`
      };
    }
    if (this.matchesDomainSet(domain, KNOWN_BLOCK_DOMAINS)) {
      return {
        classification: "blocked",
        source: "known_block_list",
        domain,
        reason: `Known sensitive site: ${domain}`
      };
    }
    if (hasCreditCardField) {
      return {
        classification: "blocked",
        source: "heuristic_block",
        domain,
        reason: "Credit card input detected"
      };
    }
    if (hasPasswordField) {
      return {
        classification: "blocked",
        source: "heuristic_block",
        domain,
        reason: "Password field detected on unknown site"
      };
    }
    for (const pattern of BLOCK_DOMAIN_PATTERNS) {
      if (pattern.test(domain) || pattern.test(parsedUrl.pathname)) {
        return {
          classification: "blocked",
          source: "heuristic_block",
          domain,
          reason: `URL matches sensitive pattern: ${pattern.source}`
        };
      }
    }
    const authPathPatterns = [
      /\/sign[-_]?in/i,
      /\/log[-_]?in/i,
      /\/oauth/i,
      /\/sso/i,
      /\/auth\//i,
      /\/callback.*code=/i,
      /GeneralOAuthFlow/i
    ];
    const fullUrl = parsedUrl.pathname + parsedUrl.search;
    for (const pattern of authPathPatterns) {
      if (pattern.test(fullUrl)) {
        return {
          classification: "blocked",
          source: "heuristic_block",
          domain,
          reason: `Auth/login page detected: ${pattern.source}`
        };
      }
    }
    return {
      classification: "allowed",
      source: "default_allow",
      domain,
      reason: "Unknown domain \u2014 allowed by default (sensitive sites are blocked above)"
    };
  }
  /** Get list of sensitive CSS selectors to check in the content script */
  getSensitiveSelectors() {
    return [...SENSITIVE_CONTENT_SIGNALS];
  }
  matchesDomainSet(domain, set) {
    if (set.has(domain)) return true;
    for (const known of set) {
      if (domain.endsWith(`.${known}`)) return true;
    }
    return false;
  }
  getBaseDomain(domain) {
    const parts = domain.split(".");
    if (parts.length <= 2) return domain;
    return parts.slice(-2).join(".");
  }
};

// src/background/context-buffer.ts
var STORAGE_KEY = "offlineQueue";
var PERSIST_DEBOUNCE_MS = 1e4;
var ContextBuffer = class {
  platform;
  queue = [];
  totalSize = 0;
  persistTimer = null;
  persistDirty = false;
  constructor(platform2) {
    this.platform = platform2;
  }
  /** Load buffered items from storage (after SW restart) */
  async load() {
    const stored = await this.platform.sessionStorage.get(STORAGE_KEY);
    if (stored) {
      this.queue = stored;
      this.totalSize = stored.reduce((sum, item) => sum + item.sizeEstimate, 0);
      this.evictStale();
    }
  }
  /** Add a message to the offline queue */
  async enqueue(message) {
    const serialized = JSON.stringify(message);
    const sizeEstimate = serialized.length * 2;
    const item = {
      message,
      queuedAt: Date.now(),
      sizeEstimate
    };
    while (this.totalSize + sizeEstimate > OFFLINE_QUEUE_MAX_BYTES && this.queue.length > 0) {
      const evicted = this.queue.shift();
      if (evicted) {
        this.totalSize -= evicted.sizeEstimate;
      }
    }
    this.queue.push(item);
    this.totalSize += sizeEstimate;
    this.schedulePersist();
  }
  /** Get all queued messages for flushing (oldest first) */
  drain() {
    this.evictStale();
    const messages = this.queue.map((item) => item.message);
    this.queue = [];
    this.totalSize = 0;
    this.cancelPersist();
    this.persist();
    return messages;
  }
  /** Number of items in the queue */
  get depth() {
    return this.queue.length;
  }
  /** Estimated total size in bytes */
  get size() {
    return this.totalSize;
  }
  /** Debounced persist: write to storage at most every PERSIST_DEBOUNCE_MS */
  schedulePersist() {
    this.persistDirty = true;
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      if (this.persistDirty) {
        this.persistDirty = false;
        this.persist();
      }
    }, PERSIST_DEBOUNCE_MS);
  }
  cancelPersist() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistDirty = false;
  }
  /** Remove items older than TTL */
  evictStale() {
    const now = Date.now();
    while (this.queue.length > 0 && this.queue[0].queuedAt + OFFLINE_QUEUE_ITEM_TTL_MS < now) {
      const evicted = this.queue.shift();
      if (evicted) {
        this.totalSize -= evicted.sizeEstimate;
      }
    }
  }
  async persist() {
    try {
      await this.platform.sessionStorage.set(STORAGE_KEY, this.queue);
    } catch {
      const half = Math.floor(this.queue.length / 2);
      const evicted = this.queue.splice(0, half);
      this.totalSize -= evicted.reduce((sum, item) => sum + item.sizeEstimate, 0);
      try {
        await this.platform.sessionStorage.set(STORAGE_KEY, this.queue);
      } catch {
        this.queue = [];
        this.totalSize = 0;
        await this.platform.sessionStorage.remove(STORAGE_KEY);
      }
    }
  }
};

// src/background/backpressure.ts
var BackpressureManager = class {
  maxRatePerMinute = DEFAULT_MAX_RATE_PER_MINUTE;
  sendTimestamps = [];
  serverOverride = null;
  /** Get current effective rate limit (messages per minute) */
  getEffectiveRate() {
    return this.serverOverride ?? this.maxRatePerMinute;
  }
  /** Check if we can send a message right now */
  canSend() {
    this.pruneOldTimestamps();
    return this.sendTimestamps.length < this.getEffectiveRate();
  }
  /** Record that a message was sent */
  recordSend() {
    this.sendTimestamps.push(Date.now());
  }
  /** Handle backpressure signal from server */
  applyServerBackpressure(maxRatePerMinute) {
    this.serverOverride = maxRatePerMinute;
  }
  /** Server says resume normal rate */
  clearServerBackpressure() {
    this.serverOverride = null;
  }
  /** Get milliseconds until next send is allowed (0 = can send now) */
  getMsUntilNextSend() {
    if (this.canSend()) return 0;
    const oldest = this.sendTimestamps[0];
    if (oldest === void 0) return 0;
    return Math.max(0, oldest + 6e4 - Date.now());
  }
  pruneOldTimestamps() {
    const oneMinuteAgo = Date.now() - 6e4;
    while (this.sendTimestamps.length > 0 && this.sendTimestamps[0] < oneMinuteAgo) {
      this.sendTimestamps.shift();
    }
  }
};

// src/background/privacy.ts
var AUDIT_STORAGE_KEY = "auditLog";
var PrivacyFilter = class {
  platform;
  auditLog = [];
  constructor(platform2) {
    this.platform = platform2;
  }
  async loadAuditLog() {
    const stored = await this.platform.persistentStorage.get(AUDIT_STORAGE_KEY);
    if (stored) {
      this.auditLog = stored;
    }
  }
  /** Strip sensitive content from page text */
  sanitizeContent(content) {
    let sanitized = content.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g, "[REDACTED_CARD]");
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]");
    return sanitized;
  }
  /** Log a classification decision */
  async logClassification(result) {
    await this.addAuditEntry({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "classification",
      domain: result.domain,
      detail: `${result.classification} via ${result.source}: ${result.reason}`,
      contentHash: null
    });
  }
  /** Log that context was sent to OpenClaw */
  async logContextSent(domain, contentHash) {
    await this.addAuditEntry({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "context_sent",
      domain,
      detail: "Context streamed to OpenClaw",
      contentHash
    });
  }
  /** Log that content was blocked */
  async logContextBlocked(domain, reason) {
    await this.addAuditEntry({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "context_blocked",
      domain,
      detail: `Blocked: ${reason}`,
      contentHash: null
    });
  }
  /** Log auth events */
  async logAuthEvent(detail) {
    await this.addAuditEntry({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "auth_event",
      domain: "",
      detail,
      contentHash: null
    });
  }
  /** Get audit log entries (most recent first) */
  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit).reverse();
  }
  /** Export audit log as JSON string */
  exportAuditLog() {
    return JSON.stringify(this.auditLog, null, 2);
  }
  /** Compute SHA-256 hash of content (for audit trail — stores hash, not content) */
  async hashContent(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async addAuditEntry(entry) {
    this.auditLog.push(entry);
    if (this.auditLog.length > AUDIT_LOG_MAX_ENTRIES) {
      this.auditLog = this.auditLog.slice(-AUDIT_LOG_MAX_ENTRIES);
    }
    this.platform.persistentStorage.set(AUDIT_STORAGE_KEY, this.auditLog).catch(() => {
    });
  }
};

// src/background/workflow-recorder.ts
var STORAGE_KEY2 = "workflowPatterns";
var MIN_PATTERN_FREQUENCY = 3;
var SEQUENCE_TIMEOUT_MS = 5 * 60 * 1e3;
var MAX_SEQUENCES = 100;
var MAX_PATTERNS = 50;
var WorkflowRecorder = class {
  platform;
  callback;
  currentSequence = null;
  sequences = [];
  patterns = [];
  constructor(platform2, callback) {
    this.platform = platform2;
    this.callback = callback;
  }
  async load() {
    const stored = await this.platform.persistentStorage.get(STORAGE_KEY2);
    if (stored) {
      this.patterns = stored;
    }
  }
  /** Record a user action from the content script */
  recordAction(action) {
    const now = Date.now();
    if (!this.currentSequence || now - this.currentSequence.lastActionTime > SEQUENCE_TIMEOUT_MS) {
      if (this.currentSequence && this.currentSequence.urls.length >= 2) {
        this.sequences.push(this.currentSequence);
        this.trimSequences();
        this.detectPatterns();
      }
      this.currentSequence = {
        urls: [],
        startTime: now,
        lastActionTime: now
      };
    }
    if (action.type === "navigation" || action.type === "click") {
      const domain = this.extractDomain(action.url);
      const lastUrl = this.currentSequence.urls[this.currentSequence.urls.length - 1];
      if (domain && domain !== lastUrl) {
        this.currentSequence.urls.push(domain);
        this.currentSequence.lastActionTime = now;
      }
    }
  }
  /** Get detected patterns (frequency >= threshold) */
  getPatterns() {
    return this.patterns.filter((p) => p.frequency >= MIN_PATTERN_FREQUENCY);
  }
  detectPatterns() {
    const domainSequences = this.sequences.map((s) => s.urls);
    const subsequenceCounts = /* @__PURE__ */ new Map();
    for (const seq of domainSequences) {
      for (let len = 2; len <= Math.min(5, seq.length); len++) {
        for (let start = 0; start <= seq.length - len; start++) {
          const sub = seq.slice(start, start + len).join(" \u2192 ");
          subsequenceCounts.set(sub, (subsequenceCounts.get(sub) ?? 0) + 1);
        }
      }
    }
    for (const [subseq, count] of subsequenceCounts) {
      if (count >= MIN_PATTERN_FREQUENCY) {
        const existing = this.patterns.find((p) => p.name === subseq);
        if (existing) {
          if (count > existing.frequency) {
            existing.frequency = count;
            existing.lastSeen = (/* @__PURE__ */ new Date()).toISOString();
          }
        } else {
          const pattern = {
            id: crypto.randomUUID(),
            name: subseq,
            steps: [],
            // Would need to reconstruct from domain sequence
            frequency: count,
            lastSeen: (/* @__PURE__ */ new Date()).toISOString()
          };
          this.patterns.push(pattern);
          this.callback(pattern);
        }
      }
    }
    this.trimPatterns();
    this.persist();
  }
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }
  trimSequences() {
    if (this.sequences.length > MAX_SEQUENCES) {
      this.sequences = this.sequences.slice(-MAX_SEQUENCES);
    }
  }
  trimPatterns() {
    if (this.patterns.length > MAX_PATTERNS) {
      this.patterns.sort((a, b) => b.frequency - a.frequency);
      this.patterns = this.patterns.slice(0, MAX_PATTERNS);
    }
  }
  persist() {
    this.platform.persistentStorage.set(STORAGE_KEY2, this.patterns).catch(() => {
    });
  }
};

// src/background/diff-engine.ts
function diffContent(previous, current) {
  if (previous === null) {
    return { hasChanged: true, changeRatio: 1, newContent: current };
  }
  if (previous === current) {
    return { hasChanged: false, changeRatio: 0, newContent: current };
  }
  if (current.length === 0) {
    return { hasChanged: previous.length > 0, changeRatio: 1, newContent: current };
  }
  const changeRatio = estimateChangeRatio(previous, current);
  const NOISE_THRESHOLD = 0.02;
  return {
    hasChanged: changeRatio > NOISE_THRESHOLD,
    changeRatio,
    newContent: current
  };
}
function estimateChangeRatio(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  const lengthDiff = Math.abs(a.length - b.length) / maxLen;
  const minLen = Math.min(a.length, b.length);
  const sampleSize = Math.min(minLen, 1e3);
  const step = Math.max(1, Math.floor(minLen / sampleSize));
  let differences = 0;
  let samples = 0;
  for (let i = 0; i < minLen; i += step) {
    samples++;
    if (a[i] !== b[i]) {
      differences++;
    }
  }
  const sampleDiffRatio = samples > 0 ? differences / samples : 0;
  return Math.min(1, lengthDiff * 0.4 + sampleDiffRatio * 0.6);
}

// src/lib/serializer.ts
function safeStringify(value) {
  const seen = /* @__PURE__ */ new WeakSet();
  try {
    const result = JSON.stringify(value, (_key, val) => {
      if (typeof val === "bigint") {
        return val.toString();
      }
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) {
          return "[Circular]";
        }
        seen.add(val);
      }
      return val;
    });
    if (result === void 0) {
      return err(new Error("JSON.stringify returned undefined"));
    }
    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

// src/platform/firefox.ts
var import_webextension_polyfill = __toESM(require_browser_polyfill(), 1);
var FirefoxSessionStorage = class {
  store = /* @__PURE__ */ new Map();
  async get(key) {
    return this.store.get(key) ?? null;
  }
  async set(key, value) {
    this.store.set(key, value);
  }
  async remove(key) {
    this.store.delete(key);
  }
};
var FirefoxPersistentStorage = class {
  async get(key) {
    const result = await import_webextension_polyfill.default.storage.local.get(key);
    return result[key] ?? null;
  }
  async set(key, value) {
    await import_webextension_polyfill.default.storage.local.set({ [key]: value });
  }
  async remove(key) {
    await import_webextension_polyfill.default.storage.local.remove(key);
  }
};
var FirefoxPlatform = class {
  name = "firefox";
  isEphemeral = false;
  sessionStorage = new FirefoxSessionStorage();
  persistentStorage = new FirefoxPersistentStorage();
  onWake(_callback) {
  }
  async setBadge(text, color) {
    await import_webextension_polyfill.default.browserAction.setBadgeText({ text });
    await import_webextension_polyfill.default.browserAction.setBadgeBackgroundColor({ color });
  }
  async openSidePanel(_tabId) {
    try {
      await import_webextension_polyfill.default.sidebarAction.open();
      return ok(void 0);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  async getActiveTab() {
    try {
      const [tab] = await import_webextension_polyfill.default.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        return err(new Error("No active tab found"));
      }
      return ok({ tabId: tab.id, url: tab.url, title: tab.title ?? "" });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  async sendToTab(tabId, message) {
    try {
      const response = await import_webextension_polyfill.default.tabs.sendMessage(tabId, message);
      return ok(response);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  onMessage(callback) {
    import_webextension_polyfill.default.runtime.onMessage.addListener((message, sender) => {
      return new Promise((resolve) => {
        callback(message, { tabId: sender.tab?.id }, resolve);
      });
    });
  }
  createContextMenu(options) {
    import_webextension_polyfill.default.contextMenus.create({
      id: options.id,
      title: options.title,
      contexts: options.contexts
    });
  }
  onContextMenuClick(callback) {
    import_webextension_polyfill.default.contextMenus.onClicked.addListener((info, tab) => {
      callback(
        {
          menuItemId: String(info.menuItemId),
          selectionText: info.selectionText,
          linkUrl: info.linkUrl,
          pageUrl: info.pageUrl
        },
        tab?.id
      );
    });
  }
  onCommand(callback) {
    import_webextension_polyfill.default.commands.onCommand.addListener(callback);
  }
  onTabActivated(callback) {
    import_webextension_polyfill.default.tabs.onActivated.addListener((info) => {
      callback(info.tabId);
    });
  }
  onTabRemoved(callback) {
    import_webextension_polyfill.default.tabs.onRemoved.addListener((tabId) => {
      callback(tabId);
    });
  }
  onNavigationCommitted(callback) {
    import_webextension_polyfill.default.webNavigation.onCommitted.addListener((details) => {
      if (details.frameId === 0) {
        callback(details.tabId, details.url);
      }
    });
  }
};

// src/background/service-worker.ts
var platform = true ? new FirefoxPlatform() : new ChromePlatform();
var tabRegistry = new TabRegistry();
var classifier = new Classifier(platform);
var contextBuffer = new ContextBuffer(platform);
var backpressure = new BackpressureManager();
var privacyFilter = new PrivacyFilter(platform);
var sessionId = crypto.randomUUID();
var sequence = 0;
var isPaused = false;
var backgroundPingTimer = null;
var connection = new ConnectionManager({
  onStatusChange: handleConnectionStatusChange,
  onMessage: handleServerMessage
});
var authManager = new AuthManager(platform, {
  onAuthChange: handleAuthChange
});
var workflowRecorder = new WorkflowRecorder(platform, (pattern) => {
  broadcastToUI({
    type: "NOTIFICATION",
    title: "Workflow detected",
    body: `I noticed you often visit: ${pattern.name}. Want me to summarize these for you?`,
    level: "info"
  });
});
function getState() {
  return {
    connection: connection.getStatus(),
    auth: null,
    // Don't expose full auth state to UI
    tabs: tabRegistry.getAll(),
    activeTabId: tabRegistry.getActiveTabId(),
    offlineQueueDepth: contextBuffer.depth,
    isPaused,
    backpressureRate: backpressure.getEffectiveRate(),
    extensionVersion: EXTENSION_VERSION
  };
}
function broadcastToUI(message) {
  try {
    chrome.runtime.sendMessage(message).catch(() => {
    });
  } catch {
  }
}
function broadcastStateUpdate() {
  broadcastToUI({ type: "STATE_UPDATE", state: getState() });
}
function handleConnectionStatusChange(status) {
  if (status === "connected") {
    const queued = contextBuffer.drain();
    for (const msg of queued) {
      connection.send(msg);
    }
    platform.setBadge("", "#10b981");
  } else if (status === "reconnecting") {
    platform.setBadge("...", "#f59e0b");
  } else if (status === "disconnected") {
    platform.setBadge("OFF", "#6b7280");
  }
  broadcastStateUpdate();
  const isConn = status === "connected";
  const counts = tabRegistry.getCounts();
  for (const tab of tabRegistry.getAll()) {
    platform.sendToTab(tab.tabId, {
      type: "OVERLAY_UPDATE",
      isStreaming: tab.classification.classification === "allowed" && isConn && !isPaused,
      isConnected: isConn,
      domain: tab.classification.domain,
      tabCount: counts.total
    });
  }
}
function handleServerMessage(message) {
  switch (message.type) {
    case "suggestion":
      broadcastToUI({
        type: "SUGGESTION",
        suggestion: {
          id: message.id,
          title: message.payload.title,
          body: message.payload.body,
          actions: message.payload.actions,
          priority: message.payload.priority,
          relatedTabId: message.payload.related_tab_id
        }
      });
      platform.setBadge("!", "#f97316");
      setTimeout(() => {
        if (connection.isConnected()) platform.setBadge("", "#10b981");
      }, 3e3);
      break;
    case "chat_response":
      broadcastToUI({
        type: "CHAT_RESPONSE",
        message: {
          id: message.id,
          conversationId: message.payload.conversation_id,
          role: "assistant",
          text: message.payload.text,
          timestamp: message.timestamp
        }
      });
      break;
    case "snapshot_request":
      platform.sendToTab(message.payload.tab_id, { type: "REQUEST_SNAPSHOT" });
      break;
    case "backpressure":
      if (message.payload.action === "slow_down") {
        backpressure.applyServerBackpressure(message.payload.max_rate_per_minute);
      } else {
        backpressure.clearServerBackpressure();
      }
      broadcastStateUpdate();
      break;
  }
}
function handleAuthChange(auth) {
  if (auth) {
    connection.connect(auth);
    privacyFilter.logAuthEvent(`Connected via ${auth.method} to ${auth.instanceUrl}`);
  } else {
    connection.disconnect();
    privacyFilter.logAuthEvent("Disconnected");
  }
  broadcastStateUpdate();
}
async function handleContentMessage(message, senderTabId) {
  const effectiveTabId = senderTabId ?? message.tabId;
  switch (message.type) {
    case "CONTENT_SCRIPT_READY": {
      if (effectiveTabId !== void 0 && effectiveTabId > 0) {
        platform.sendToTab(effectiveTabId, { type: "SET_TAB_ID", tabId: effectiveTabId });
      }
      break;
    }
    case "PAGE_SNAPSHOT": {
      const snapshot = message.snapshot;
      const meta = snapshot.meta;
      const hasPasswordField = Boolean(meta["_hasPasswordField"]);
      const hasCreditCardField = Boolean(meta["_hasCreditCardField"]);
      const classification = classifier.classify(snapshot.url, hasPasswordField, hasCreditCardField);
      privacyFilter.logClassification(classification);
      tabRegistry.upsert(effectiveTabId, snapshot.url, snapshot.title, classification);
      const counts = tabRegistry.getCounts();
      platform.sendToTab(effectiveTabId, {
        type: "OVERLAY_UPDATE",
        isStreaming: classification.classification === "allowed" && !isPaused,
        isConnected: connection.isConnected(),
        domain: classification.domain,
        tabCount: counts.total
      });
      if (classification.classification === "blocked") {
        privacyFilter.logContextBlocked(classification.domain, classification.reason);
        if (classification.source === "heuristic_block") {
          broadcastToUI({
            type: "CLASSIFICATION_PROMPT",
            domain: classification.domain,
            tabId: effectiveTabId,
            url: snapshot.url
          });
        }
        broadcastStateUpdate();
        return;
      }
      if (isPaused) return;
      const previousContent = tabRegistry.get(effectiveTabId)?.lastSnapshot ?? null;
      const diff = diffContent(previousContent, snapshot.content);
      if (!diff.hasChanged) return;
      tabRegistry.updateSnapshot(effectiveTabId, snapshot.content);
      const sanitizedContent = privacyFilter.sanitizeContent(diff.newContent);
      if (!backpressure.canSend()) return;
      sequence++;
      const protocolMessage = createContextUpdate(sessionId, sequence, {
        tab_id: effectiveTabId,
        url: snapshot.url,
        title: snapshot.title,
        content: sanitizedContent,
        site_data: snapshot.siteData,
        meta: snapshot.meta,
        classification: classification.classification,
        is_active_tab: tabRegistry.getActiveTabId() === effectiveTabId
      });
      if (connection.isConnected()) {
        const result = connection.send(protocolMessage);
        if (result.ok) {
          backpressure.recordSend();
          const hash = await privacyFilter.hashContent(sanitizedContent);
          privacyFilter.logContextSent(classification.domain, hash);
        } else {
          contextBuffer.enqueue(protocolMessage);
        }
      } else {
        contextBuffer.enqueue(protocolMessage);
      }
      broadcastStateUpdate();
      break;
    }
    case "SELECTION_HIGHLIGHT": {
      if (!connection.isConnected()) return;
      if (isPaused) return;
      const highlightMsg = {
        ...createEnvelope("highlight"),
        type: "highlight",
        payload: {
          tab_id: effectiveTabId,
          url: message.url,
          selected_text: message.text,
          surrounding_context: message.surroundingContext,
          page_title: message.title
        }
      };
      const serialized = safeStringify(highlightMsg);
      if (serialized.ok) {
        connection.send(highlightMsg);
      }
      break;
    }
    case "USER_ACTION": {
      workflowRecorder.recordAction(message.action);
      if (connection.isConnected()) {
        connection.send({
          ...createEnvelope("user_action"),
          type: "user_action",
          payload: {
            tab_id: effectiveTabId,
            action: message.action
          }
        });
      }
      break;
    }
  }
}
async function handleUIRequest(request) {
  switch (request.type) {
    case "GET_STATE":
      return getState();
    case "PAUSE_STREAMING":
      isPaused = true;
      broadcastStateUpdate();
      return { ok: true };
    case "RESUME_STREAMING":
      isPaused = false;
      broadcastStateUpdate();
      return { ok: true };
    case "OVERRIDE_CLASSIFICATION":
      await classifier.setOverride(request.domain, request.classification);
      broadcastStateUpdate();
      return { ok: true };
    case "TEACH_DOMAIN":
      await classifier.teachDomain(request.domain, request.isWorkTool);
      for (const tab of tabRegistry.getAll()) {
        const newClassification = classifier.classify(tab.url);
        tabRegistry.upsert(tab.tabId, tab.url, tab.title, newClassification);
      }
      for (const tab of tabRegistry.getAll()) {
        if (tab.classification.classification === "allowed") {
          platform.sendToTab(tab.tabId, { type: "REQUEST_SNAPSHOT" });
        }
      }
      broadcastStateUpdate();
      return { ok: true };
    case "START_AUTH":
      if (request.method === "oauth") {
        return authManager.startOAuth(request.instanceUrl ?? "");
      } else {
        return authManager.startApiKey(request.instanceUrl ?? "", request.apiKey ?? "");
      }
    case "DISCONNECT":
      connection.disconnect();
      await authManager.clearAuth();
      return { ok: true };
    case "SEND_CHAT": {
      if (!connection.isConnected()) return { ok: false, error: "Not connected" };
      const activeTab = tabRegistry.getActiveTab();
      const chatMsg = {
        ...createEnvelope("chat_message"),
        type: "chat_message",
        payload: {
          conversation_id: request.conversationId ?? crypto.randomUUID(),
          text: request.text,
          current_tab_context: activeTab ? { url: activeTab.url, title: activeTab.title } : null
        }
      };
      connection.send(chatMsg);
      return { ok: true };
    }
    case "TOGGLE_DEBUG_OVERLAY":
      platform.sendToTab(request.tabId, {
        type: "TOGGLE_DEBUG_OVERLAY",
        enabled: request.enabled,
        isStreaming: tabRegistry.get(request.tabId)?.classification.classification === "allowed"
      });
      return { ok: true };
    case "REQUEST_SNAPSHOT":
      platform.sendToTab(request.tabId, { type: "REQUEST_SNAPSHOT" });
      return { ok: true };
  }
}
function startBackgroundPings() {
  if (backgroundPingTimer) clearInterval(backgroundPingTimer);
  backgroundPingTimer = setInterval(() => {
    if (!connection.isConnected() || isPaused) return;
    const backgroundTabs = tabRegistry.getBackgroundTabs();
    if (backgroundTabs.length === 0) return;
    const pingMsg = {
      ...createEnvelope("tab_ping"),
      type: "tab_ping",
      payload: {
        tabs: backgroundTabs.map((t) => ({
          tab_id: t.tabId,
          url: t.url,
          title: t.title
        }))
      }
    };
    connection.send(pingMsg);
  }, BACKGROUND_PING_INTERVAL_MS);
}
function setupContextMenu() {
  platform.createContextMenu({
    id: "ask-openclaw",
    title: "Ask OpenClaw about this",
    contexts: ["selection", "link", "page"]
  });
  platform.onContextMenuClick((info, tabId) => {
    if (info.menuItemId !== "ask-openclaw") return;
    if (!connection.isConnected()) return;
    const contextMenuMsg = {
      ...createEnvelope("context_menu_action"),
      type: "context_menu_action",
      payload: {
        tab_id: tabId ?? -1,
        url: info.pageUrl ?? "",
        element_text: info.selectionText ?? "",
        element_type: info.linkUrl ? "link" : "text",
        link_url: info.linkUrl ?? null,
        surrounding_context: info.selectionText ?? "",
        page_title: ""
        // Would need to query tab for this
      }
    };
    connection.send(contextMenuMsg);
  });
}
function setupCommands() {
  platform.onCommand(async (command) => {
    if (command !== "send-highlight") return;
    const tabResult = await platform.getActiveTab();
    if (!tabResult.ok) return;
    const { tabId: activeTabId } = tabResult.value;
    try {
      const selection = await platform.sessionStorage.get(
        `selection_${activeTabId}`
      );
      if (selection && selection.text) {
        handleContentMessage({
          type: "SELECTION_HIGHLIGHT",
          tabId: activeTabId,
          text: selection.text,
          surroundingContext: selection.context,
          url: tabResult.value.url,
          title: tabResult.value.title
        });
      }
    } catch {
    }
  });
}
function setupTabListeners() {
  platform.onTabActivated((tabId) => {
    tabRegistry.activate(tabId);
    platform.sendToTab(tabId, { type: "REQUEST_SNAPSHOT" });
    broadcastStateUpdate();
  });
  platform.onTabRemoved((tabId) => {
    tabRegistry.remove(tabId);
    broadcastStateUpdate();
  });
  platform.onNavigationCommitted((tabId, url) => {
    const tab = tabRegistry.get(tabId);
    if (tab) {
      const classification = classifier.classify(url);
      tabRegistry.upsert(tabId, url, tab.title, classification);
    }
  });
}
platform.onMessage((message, sender, sendResponse) => {
  const msg = message;
  const msgType = msg.type;
  const uiRequestTypes = [
    "GET_STATE",
    "PAUSE_STREAMING",
    "RESUME_STREAMING",
    "OVERRIDE_CLASSIFICATION",
    "TEACH_DOMAIN",
    "START_AUTH",
    "DISCONNECT",
    "SEND_CHAT",
    "TOGGLE_DEBUG_OVERLAY",
    "REQUEST_SNAPSHOT"
  ];
  if (uiRequestTypes.includes(msgType)) {
    handleUIRequest(msg).then((response) => sendResponse(response)).catch((error) => {
      console.error("[ServiceWorker] UI request failed:", error);
      sendResponse({ ok: false, error: String(error) });
    });
    return;
  }
  if (sender.tabId) {
    handleContentMessage(msg, sender.tabId);
    return;
  }
  handleUIRequest(msg).then((response) => {
    sendResponse(response);
  }).catch((error) => {
    console.error("[ServiceWorker] UI request failed:", error);
    sendResponse({ ok: false, error: String(error) });
  });
});
platform.onWake(async () => {
  sessionId = crypto.randomUUID();
  sequence = 0;
  try {
    await Promise.all([
      classifier.loadOverrides(),
      contextBuffer.load(),
      privacyFilter.loadAuditLog(),
      workflowRecorder.load()
    ]);
  } catch (e) {
    console.error("[ServiceWorker] Failed to restore state on wake:", e);
  }
  const storedRegistry = await platform.sessionStorage.get("tabRegistry");
  if (storedRegistry) {
    tabRegistry.deserialize(storedRegistry);
  }
  const auth = await authManager.loadStored();
  if (auth) {
    connection.connect(auth);
  }
  startBackgroundPings();
});
async function init() {
  try {
    await Promise.all([
      classifier.loadOverrides(),
      contextBuffer.load(),
      privacyFilter.loadAuditLog(),
      workflowRecorder.load()
    ]);
  } catch (e) {
    console.error("[ServiceWorker] Failed to initialize state:", e);
  }
  setupContextMenu();
  setupCommands();
  setupTabListeners();
  startBackgroundPings();
  const auth = await authManager.loadStored();
  if (auth) {
    connection.connect(auth);
  } else {
    platform.setBadge("SET", "#6b7280");
  }
  setInterval(() => {
    platform.sessionStorage.set("tabRegistry", tabRegistry.serialize());
  }, 1e4);
  console.log("[OpenClaw Extension] Service worker initialized");
}
init();
//# sourceMappingURL=service-worker.js.map
