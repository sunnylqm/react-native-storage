/*
 *  local storage(web/react native) wrapper
 *  sunnylqm 2016-01-26
 *  version 0.0.12
 */

export default class Storage {
  constructor(options = {}) {
    let me = this;

    me._SIZE = options.size || 1000;   // maximum capacity
    me.sync = options.sync || {};      // remote sync method
    me.defaultExpires = options.defaultExpires || 1000 * 3600 * 24;
    me.enableCache = options.enableCache || true;
    me._innerVersion = 10;
    me.cache = {};

    //detect browser or ios javascriptCore
    me.isBrowser = false;
    if(window && window.localStorage) {
      try {
        // avoid key conflict
        window.localStorage.setItem('__react_native_storage_test', 'test');

        me._s = window.localStorage;
        me.isBrowser = true;
      }
      catch(e) {
        console.warn(e);
        delete me._s;
        throw e;
      }
    }
    else {
      me._s = require('react-native').AsyncStorage;
    }

    me._mapPromise = me.getItem('map').then( map => {
      me._m = me._checkMap(map && JSON.parse(map) || {});
      delete me._mapPromise;
    });
  }
  getItem(key) {
    return this._s
      ?
      this.isBrowser ? new Promise((resolve, reject) => resolve(this._s.getItem(key))) : this._s.getItem(key)
      :
      Promise.resolve();
  }
  setItem(key, value) {
    return this._s
      ?
      this.isBrowser ? new Promise((resolve, reject) => resolve(this._s.setItem(key, value))) : this._s.setItem(key, value)
      :
      Promise.resolve();
  }
  removeItem(key) {
    return this._s
      ? this.isBrowser ? new Promise((resolve, reject) => resolve(this._s.removeItem(key))) : this._s.removeItem(key)
      :
      Promise.resolve();
  }
  _checkMap(map) {
    let me = this;
    if(map && map.innerVersion && map.innerVersion === me._innerVersion ) {
      return map;
    }
    else {
      return {
        innerVersion: me._innerVersion,
        index: 0
      };
    }
  }
  _getId(key, id) {
    return key + '_' + id;
  }
  _saveToMap(params) {
    var promise = new Promise((resolve, reject) => {
      let { key, id, data } = params,
        newId = this._getId(key, id),
        m = this._m;
      if(m[newId] !== undefined) {
        //update existed data
        if(this.enableCache) this.cache[newId] = JSON.parse(data);
        return resolve(this.setItem('map_' + m[newId], data));
      }
      if(m[m.index] !== undefined){
        //loop over, delete old data
        let oldId = m[m.index];
        delete m[oldId];
        if(this.enableCache) {
          delete this.cache[oldId];
        }
      }
      m[newId] = m.index;
      m[m.index] = newId;
      if(this.enableCache) {
        const cacheData = JSON.parse(data);
        this.cache[newId] = cacheData;
      }

      resolve(this.setItem('map_' + m.index, data)
        .then(this.setItem('map', JSON.stringify(m))));
      if(++m.index === this._SIZE) {
        m.index = 0;
      }
    });
    return this._mapPromise ? this._mapPromise.then(() => promise) : promise;
  }
  save(params) {
    var promise;
    let me = this;
    let { key, id, rawData, expires } = params;
    if(key.toString().indexOf('_') !== -1) {
      console.error('Please do not use "_" in key!');
    }
    let data = {
      rawData
    };
    let now = new Date().getTime();
    if(expires === undefined) {
      expires = me.defaultExpires;
    }
    if(expires !== null) {
      data.expires = now + expires;
    }
    data = JSON.stringify(data);
    if(id === undefined) {
      if(me.enableCache) {
        const cacheData = JSON.parse(data);
        me.cache[key] = cacheData;
      }
      promise = me.setItem(key, data);
    }
    else {
      if(id.toString().indexOf('_') !== -1) {
        console.error('Please do not use "_" in id!');
      }
      promise = me._saveToMap({
        key,
        id,
        data
      });
    }
    return this._mapPromise ? this._mapPromise.then(() => promise) : promise;
  }
  getBatchData(querys) {
    let me = this;
    let tasks = [];
    for(let i = 0, query; query = querys[i]; i++) {
      tasks[i] = me.load(query);
      //let { key, id } = query;
      //let newId = id === undefined ? key : me._getId(key, id);
      //if(me.enableCache && me.cache[newId] !== undefined) {
      //  tasks[i] = me.cache[newId];
      //}
      //else {
      //  tasks[i] = me.load(query);
      //}
    }
    return Promise.all(tasks);
  }
  getBatchDataWithIds(params) {
    let me = this;
    let { key, ids, syncInBackground } = params;

    return Promise.all(
      ids.map((id) => me.load({ key, id, syncInBackground, autoSync: false, batched: true }))
    ).then((results) => handlePromise((resolve, reject) => me.sync[key]({
      id: results
        .filter((value) => value.syncId !== undefined)
        .map((value) => value.syncId),
      resolve: resolve,
      reject: reject
    })).then((data) => results.map((value) => value.syncId ? data.shift() : value)))
  }
  _lookupGlobalItem(params) {
    let me = this,
      ret;
    let { key } = params;
    if(me.enableCache && me.cache[key] !== undefined) {
      ret = me.cache[key];
      return me._loadGlobalItem({ ret, ...params });
    }
    return me.getItem(key).then(ret => me._loadGlobalItem({ ret, ...params }));
  }
  _loadGlobalItem(params) {
    let me = this;
    let { key, ret, autoSync, syncInBackground } = params;
    if(ret === null || ret === undefined) {
      if(autoSync && me.sync[key]) {
        return handlePromise((resolve, reject) => me.sync[key]({resolve, reject}));
      }
      return Promise.reject();
    }
    if(typeof ret === 'string') {
      ret = JSON.parse(ret);
    }
    let now = new Date().getTime();
    if(autoSync && ret.expires < now && me.sync[key]) {
      if(syncInBackground) {
        me.sync[key]({});
        return Promise.resolve(ret.rawData);
      }
      return handlePromise((resolve, reject) => me.sync[key]({resolve, reject}));
    }
    return Promise.resolve(ret.rawData);
  }
  _noItemFound(params) {
    let me = this;
    let { key, id, resolve, reject, autoSync } = params;
    if(me.sync[key]) {
      if(autoSync) {
        return handlePromise((resolve, reject) => me.sync[key]({id, resolve, reject}));
      }
      return Promise.resolve({ syncId: id });
    }
    return Promise.reject();
  }
  _loadMapItem(params) {
    let me = this;
    let { ret, key, id, resolve, reject, autoSync, batched, syncInBackground } = params;
    if(ret === null || ret === undefined) {
      return me._noItemFound(params);
    }
    if(typeof ret === 'string'){
      ret = JSON.parse(ret);
    }
    let now = new Date().getTime();
    if(autoSync && ret.expires < now) {
      if(me.sync[key]) {
        if(syncInBackground){
          me.sync[key]({id});
          return Promise.resolve(ret.rawData);
        }
        return handlePromise((resolve, reject) => me.sync[key]({id, resolve, reject}));
      }
      if(batched) {
        return Promise.resolve({ syncId: id });
      }
    }
    return Promise.resolve(ret.rawData);
  }
  _lookUpInMap(params) {
    let me = this,
      m = me._m,
      ret;
    let { key, id } = params;
    let newId = me._getId(key, id);
    if(me.enableCache && me.cache[newId]) {
      ret = me.cache[newId];
      return me._loadMapItem( {ret, ...params } );
    }
    if(m[newId] !== undefined) {
      return me.getItem('map_' + m[newId]).then( ret => me._loadMapItem( {ret, ...params } ) );
    }
    return me._noItemFound( {ret, ...params } );
  }
  remove(params) {
    let me = this,
      m = me._m;
    let { key, id } = params;

    if(id === undefined) {
      if(me.enableCache && me.cache[key]) {
        delete me.cache[key];
      }
      return me.removeItem(key);
    }
    let newId = me._getId(key, id);

    //remove existed data
    if(m[newId] !== undefined) {
      if(me.enableCache && me.cache[newId]) {
        delete me.cache[newId];
      }
      let idTobeDeleted = m[newId];
      delete m[newId];
      me.setItem('map', JSON.stringify(m));
      return me.removeItem('map_' + idTobeDeleted);
    }
  }
  load(params) {
    let me = this,
      m = me._m;
    let { key, id, autoSync, syncInBackground } = params;
    if(autoSync === undefined) {
      autoSync = true;
    }
    if(syncInBackground === undefined) {
      syncInBackground = true;
    }
    let promise = new Promise((resolve, reject) => {
      if(id === undefined) {
        return resolve(me._lookupGlobalItem({key, resolve, reject, autoSync, syncInBackground}));
      }
      return resolve(me._lookUpInMap({key, id, resolve, reject, autoSync, syncInBackground}));
    });
    return this._mapPromise ? this._mapPromise.then(() => promise) : promise;
  }
  clearMap(){
    let me = this;
    me.removeItem('map');
    me._m = {
      innerVersion: me._innerVersion,
      index: 0
    };
  }
}

function noop() {}

// compatible with legacy version promise
function handlePromise (fn) {
  return new Promise((resolve, reject) => {
    var promise, isPromise;
    if (isPromise = (promise = fn((data) => isPromise ? noop() : resolve(data), (err) => isPromise ? noop() : reject(err))) instanceof Promise) resolve(promise);
  });
}
