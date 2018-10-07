const localStorageMock = (() => {
  const data = {};
  const localStorage = {
    getItem(key) {
      return data[key] === undefined ? null : data[key];
    },
    setItem(key, value) {
      data[key] = value;
    },
    removeItem(key) {
      delete data[key];
    }
  };
  return localStorage;
})();
const asyncStorageMock = (() => {
  const data = {};
  const asyncStorage = {
    getItem(key) {
      return new Promise((resolve, reject) => {
        resolve(data[key]);
      });
    },
    setItem(key, value) {
      return new Promise((resolve, reject) => {
        data[key] = value;
        resolve();
      });
    },
    removeItem(key) {
      return new Promise((resolve, reject) => {
        delete data[key];
        resolve();
      });
    }
  };
  return asyncStorage;
})();
global.localStorage = localStorageMock;
global.asyncStorage = asyncStorageMock;
