/*
 *  local storage(web/react native) wrapper
 *  sunnylqm 2016-05-27
 *  version 0.1.0
 */

export default class Storage {
  constructor(options = {}) {
    let me = this;

    me._SIZE = options.size || 1000;   // maximum capacity
    me.sync = options.sync || {};      // remote sync method
    me.defaultExpires = options.defaultExpires || 1000 * 3600 * 24;
    me.enableCache = options.enableCache || true;
    me._s = options.storageBackend || null;
    me.isPromise = options.isPromise || true;
    me._innerVersion = 11;
    me.cache = {};

    if(!me._s) {
      if(typeof window !== 'undefined' && window.localStorage) {
        try {
          // avoid key conflict
          window.localStorage.setItem('__react_native_storage_test', 'test');

          me._s = window.localStorage;
          me.isPromise = false;
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
    }

    me._mapPromise = me.getItem('map').then( map => {
      me._m = me._checkMap(map && JSON.parse(map) || {});
      // delete me._mapPromise;
    });
  }
  getItem(key) {
    return this._s
      ?
      this.isPromise ? this._s.getItem(key) : Promise.resolve(this._s.getItem(key))
      :
      Promise.resolve();
  }
  setItem(key, value) {
    return this._s
      ?
      this.isPromise ? this._s.setItem(key, value) : Promise.resolve(this._s.setItem(key, value))
      :
      Promise.resolve();
  }
  removeItem(key) {
    return this._s
      ? this.isPromise ? this._s.removeItem(key) : Promise.resolve(this._s.removeItem(key))
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
        index: 0,
        __keys__: {}
      };
    }
  }
  _getId(key, id) {
    return key + '_' + id;
  }
  _saveToMap(params) {
    let { key, id, data } = params,
      newId = this._getId(key, id),
      m = this._m;
    if(m[newId] !== undefined) {
      //update existed data
      if(this.enableCache) this.cache[newId] = JSON.parse(data);
      return this.setItem('map_' + m[newId], data);
    }
    if(m[m.index] !== undefined){
      //loop over, delete old data
      let oldId = m[m.index];
      let splitOldId = oldId.split('_')
      delete m[oldId];
      this._removeIdInKey(splitOldId[0], splitOldId[1])
      if(this.enableCache) {
        delete this.cache[oldId];
      }
    }
    m[newId] = m.index;
    m[m.index] = newId;

    m.__keys__[key] = m.__keys__[key] || [];
    m.__keys__[key].push(id);

    if(this.enableCache) {
      const cacheData = JSON.parse(data);
      this.cache[newId] = cacheData;
    }
    let currentIndex = m.index;
    if(++m.index === this._SIZE) {
      m.index = 0;
    }
    this.setItem('map_' + currentIndex, data);
    this.setItem('map', JSON.stringify(m));
  }
  save(params) {
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
      return me.setItem(key, data);
    }
    else {
      if(id.toString().indexOf('_') !== -1) {
        console.error('Please do not use "_" in id!');
      }
      return this._mapPromise.then(() => me._saveToMap({
        key,
        id,
        data
      }));
    }
  }
  getBatchData(querys) {
    let me = this;
    let tasks = [];
    for(let i = 0, query; query = querys[i]; i++) {
      tasks[i] = me.load(query);
    }
    return Promise.all(tasks);
  }
  getBatchDataWithIds(params) {
    let me = this;
    let { key, ids, syncInBackground } = params;

    return Promise.all(
      ids.map((id) => me.load({ key, id, syncInBackground, autoSync: false, batched: true }))
    ).then((results) => {
      return new Promise((resolve, reject) => {
        const ids = results.filter((value) => value.syncId !== undefined);
        if(!ids.length){
          return resolve();
        }
        return me.sync[key]({
          id: ids.map((value) => value.syncId),
          resolve,
          reject
        });
      }).then((data) => {
        return results.map(value => {
          return value.syncId ? data.shift() : value
        });
      });
    })
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
        return new Promise((resolve, reject) => me.sync[key]({resolve, reject}));
      }
      return Promise.reject();
    }
    if(typeof ret === 'string') {
      ret = JSON.parse(ret);
    }
    let now = new Date().getTime();
    if(autoSync && ret.expires < now) {
      if (me.sync[key]){
        if(syncInBackground) {
          me.sync[key]({});
          return Promise.resolve(ret.rawData);
        }
        return new Promise((resolve, reject) => me.sync[key]({resolve, reject}));
      }
      return Promise.reject();
    }
    return Promise.resolve(ret.rawData);
  }
  _noItemFound(params) {
    let me = this;
    let { key, id, autoSync } = params;
    if(me.sync[key]) {
      if(autoSync) {
        return new Promise((resolve, reject) => me.sync[key]({id, resolve, reject}));
      }
      return Promise.resolve({ syncId: id });
    }
    return Promise.reject();
  }
  _loadMapItem(params) {
    let me = this;
    let { ret, key, id, autoSync, batched, syncInBackground } = params;
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
        return new Promise((resolve, reject) => me.sync[key]({id, resolve, reject}));
      }
      if(batched) {
        return Promise.resolve({ syncId: id });
      }
      return Promise.reject();
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
    return this._mapPromise.then(() => {
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
        me._removeIdInKey(key, id);
        let idTobeDeleted = m[newId];
        delete m[newId];
        me.setItem('map', JSON.stringify(m));
        return me.removeItem('map_' + idTobeDeleted);
      }
    });
  }
  _removeIdInKey(key, id) {
    let indexTobeRemoved = this._m.__keys__[key].indexOf(id);
    if(indexTobeRemoved !== -1) {
      this._m.__keys__[key].splice(indexTobeRemoved, 1);
    }
  }
  load(params) {
    let me = this;
    let { key, id, autoSync, syncInBackground } = params;
    if(autoSync === undefined) {
      autoSync = true;
    }
    if(syncInBackground === undefined) {
      syncInBackground = true;
    }
    return me._mapPromise.then(() => new Promise((resolve, reject) => {
      if(id === undefined) {
        return resolve(me._lookupGlobalItem({key, resolve, reject, autoSync, syncInBackground}));
      }
      return resolve(me._lookUpInMap({key, id, resolve, reject, autoSync, syncInBackground}));
    }));
  }
  clearMap(){
    let me = this;
    me.removeItem('map');
    me._m = {
      innerVersion: me._innerVersion,
      index: 0
    };
  }
  clearMapForKey(key) {
    return this._mapPromise.then(() => {
      let tasks = this._m.__keys__[key].map(id => this.remove({ key, id }));
      return Promise.all(tasks);
    });
  }
  getIdsForKey(key) {
    return this._mapPromise.then(() => {
      return this._m.__keys__[key] || [];
    });
  }
  getAllDataForKey(key, options) {
    options = Object.assign({ syncInBackground: true }, options);
    return this.getIdsForKey(key).then(ids => {
      let querys = ids.map(id => ({ key, id, syncInBackground: options.syncInBackground }));
      return this.getBatchData(querys);
    });
  }

}

// function noop() {}
//
// // compatible with legacy version promise
// function handlePromise (fn) {
//   return new Promise((resolve, reject) => {
//     var promise, isPromise;
//     if (isPromise = (promise = fn((data) => isPromise ? noop() : resolve(data), (err) => isPromise ? noop() : reject(err))) instanceof Promise) resolve(promise);
//   });
// }
