var localStorageMock = (function() {
  var oStorage = {
  };
  //Object.defineProperty(oStorage, "key", {
  //  value: function (nKeyId) {
  //    var key = Object.keys(oStorage)[nKeyId];
  //    return (typeof key === "undefined") ? null : unescape(key);
  //  },
  //  writable: false,
  //  configurable: false,
  //  enumerable: false
  //});
  Object.defineProperty(oStorage, "getItem", {
    value: function (key) {
      return (oStorage[key] === undefined) ? null : oStorage[key];
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(oStorage, "setItem", {
    value: function (sKey, sValue) {
      if (typeof sValue !== "object") {
        oStorage[sKey] = sValue + "";
      } else {
        oStorage[sKey] = sValue;
      }
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(oStorage, "removeItem", {
    value: function (sKey) {
      if (!sKey) {
        return;
      }
      delete oStorage[sKey]
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(oStorage, "length", {
    get: function () {
      return  Object.keys(oStorage).length;
    },
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(oStorage, "clear", {
    value: function () {
      Object.keys(oStorage).forEach(function (key) {

        delete oStorage[key];
      });
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  return oStorage;
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });