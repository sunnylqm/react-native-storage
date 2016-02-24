var localStorageMock = (function() {
  var localStorage = {
  };
  Object.defineProperty(localStorage, "getItem", {
    value: function (key) {
      return (localStorage[key] === undefined) ? null : localStorage[key];
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(localStorage, "setItem", {
    value: function (sKey, sValue) {
      if (typeof sValue !== "object") {
        localStorage[sKey] = sValue + "";
      } else {
        localStorage[sKey] = sValue;
      }
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(localStorage, "removeItem", {
    value: function (sKey) {
      if (!sKey) {
        return;
      }
      delete localStorage[sKey]
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(localStorage, "length", {
    get: function () {
      return  Object.keys(localStorage).length;
    },
    configurable: false,
    enumerable: false
  });
  Object.defineProperty(localStorage, "clear", {
    value: function () {
      Object.keys(localStorage).forEach(function (key) {

        delete localStorage[key];
      });
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
  return localStorage;
})();
var asyncStorageMock = (function() {
  var data = {}
  var asyncStorage = {
    getItem: function (key) {
      return new Promise((resolve, reject) => {
        resolve(data[key])
      });
    },
    setItem: function (key, value) {
      return new Promise((resolve, reject) => {
        data[key] = value;
        resolve();
      });
    },
    removeItem: function (key) {
      return new Promise((resolve, reject) => {
        if(data[key]) {
          delete data[key];
        }
        resolve();
      });
    }
  };
  return asyncStorage;
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'asyncStorage', { value: asyncStorageMock });