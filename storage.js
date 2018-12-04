/*
 *  local storage(web/react native) wrapper
 */
import { NotFoundError, ExpiredError } from './error';

export default class Storage {
  constructor(options = {}) {
    this._SIZE = options.size || 1000;   // maximum capacity
    this.sync = options.sync || {};      // remote sync method
    this.defaultExpires = options.defaultExpires !== undefined ?
      options.defaultExpires : 1000 * 3600 * 24;
    this.enableCache = options.enableCache !== false;
    this._s = options.storageBackend || null;
    this._innerVersion = 11;
    this.cache = {};

    if (this._s && this._s.setItem) {
      try {
        var promiseTest = this._s.setItem('__react_native_storage_test', 'test');
        this.isPromise = !!(promiseTest && promiseTest.then);
      }
      catch (e) {
        console.warn(e);
        delete this._s;
        throw e;
      }
    } else {
      console.warn(`Data would be lost after reload cause there is no storageBackend specified!
      \nEither use localStorage(for web) or AsyncStorage(for React Native) as a storageBackend.`)
    }

    this._mapPromise = this.getItem('map').then(map => {
      this._m = this._checkMap(map && JSON.parse(map) || {});
      // delete this._mapPromise;
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
  _initMap() {
    return {
      innerVersion: this._innerVersion,
      index: 0,
      __keys__: {}
    };
  }
  _checkMap(map) {
    if(map && map.innerVersion && map.innerVersion === this._innerVersion ) {
      return map;
    }
    else {
      return this._initMap();
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
    const { key, id, data, rawData, expires = this.defaultExpires } = params;
    if (key.toString().indexOf('_') !== -1) {
      console.error('Please do not use "_" in key!');
    }
    let dataToSave = { rawData: data };
    if (data === undefined) {
      if (rawData !== undefined) {
        console.warn('"rawData" is deprecated, please use "data" instead!');
        dataToSave.rawData = rawData;
      } else {
        console.error('"data" is required in save()!');
        return;
      }
    }
    let now = new Date().getTime();
    if(expires !== null) {
      dataToSave.expires = now + expires;
    }
    dataToSave = JSON.stringify(dataToSave);
    if(id === undefined) {
      if(this.enableCache) {
        const cacheData = JSON.parse(dataToSave);
        this.cache[key] = cacheData;
      }
      return this.setItem(key, dataToSave);
    }
    else {
      if(id.toString().indexOf('_') !== -1) {
        console.error('Please do not use "_" in id!');
      }
      return this._mapPromise.then(() => this._saveToMap({
        key,
        id,
        data: dataToSave
      }));
    }
  }
  getBatchData(querys) {
    let tasks = [];
    for(let i = 0, query; query = querys[i]; i++) {
      tasks[i] = this.load(query);
    }
    return Promise.all(tasks);
  }
  getBatchDataWithIds(params) {
    let { key, ids, syncInBackground, syncParams } = params;

    return Promise.all(
      ids.map((id) => this.load({ key, id, syncInBackground, autoSync: false, batched: true, syncParams }))
    ).then((results) => {
      return new Promise((resolve, reject) => {
        const ids = results.filter((value) => value.syncId !== undefined);
        if(!ids.length){
          return resolve();
        }
        return this.sync[key]({
          id: ids.map((value) => value.syncId),
          resolve,
          reject,
          syncParams
        });
      }).then((data) => {
        return results.map(value => {
          return value.syncId ? data.shift() : value
        });
      });
    })
  }
  _lookupGlobalItem(params) {
    let ret;
    let { key } = params;
    if(this.enableCache && this.cache[key] !== undefined) {
      ret = this.cache[key];
      return this._loadGlobalItem({ ret, ...params });
    }
    return this.getItem(key).then(ret => this._loadGlobalItem({ ret, ...params }));
  }
  _loadGlobalItem(params) {
    let { key, ret, autoSync, syncInBackground, syncParams } = params;
    if(ret === null || ret === undefined) {
      if(autoSync && this.sync[key]) {
        return new Promise((resolve, reject) => this.sync[key]({ resolve, reject, syncParams }));
      }
      return Promise.reject(new NotFoundError(JSON.stringify(params)));
    }
    if (typeof ret === 'string') {
      ret = JSON.parse(ret);
      if (this.enableCache) {
        this.cache[key] = ret;
      }
    }
    let now = new Date().getTime();
    if(ret.expires < now) {
      if (autoSync && this.sync[key]){
        if(syncInBackground) {
          this.sync[key]({ syncParams });
          return Promise.resolve(ret.rawData);
        }
        return new Promise((resolve, reject) => this.sync[key]({ resolve, reject, syncParams }));
      }
      return Promise.reject(new ExpiredError(JSON.stringify(params)));
    }
    return Promise.resolve(ret.rawData);
  }
  _noItemFound(params) {
    let { key, id, autoSync, syncParams } = params;
    if(this.sync[key]) {
      if(autoSync) {
        return new Promise((resolve, reject) => this.sync[key]({ id, syncParams, resolve, reject }));
      }
      return Promise.resolve({ syncId: id });
    }
    return Promise.reject(new NotFoundError(JSON.stringify(params)));
  }
  _loadMapItem(params) {
    let { ret, key, id, autoSync, batched, syncInBackground, syncParams } = params;
    if(ret === null || ret === undefined) {
      return this._noItemFound(params);
    }
    if(typeof ret === 'string'){
      ret = JSON.parse(ret);
      const { key, id } = params;
      const newId = this._getId(key, id);
      if (this.enableCache) {
        this.cache[newId] = ret;
      }
    }
    let now = new Date().getTime();
    if(ret.expires < now) {
      if(autoSync && this.sync[key]) {
        if(syncInBackground) {
          this.sync[key]({ id, syncParams });
          return Promise.resolve(ret.rawData);
        }
        return new Promise((resolve, reject) => this.sync[key]({ id, resolve, reject, syncParams }));
      }
      if(batched) {
        return Promise.resolve({ syncId: id });
      }
      return Promise.reject(new ExpiredError(JSON.stringify(params)));
    }
    return Promise.resolve(ret.rawData);
  }
  _lookUpInMap(params) {
    let m = this._m,
      ret;
    let { key, id } = params;
    let newId = this._getId(key, id);
    if(this.enableCache && this.cache[newId]) {
      ret = this.cache[newId];
      return this._loadMapItem( {ret, ...params } );
    }
    if(m[newId] !== undefined) {
      return this.getItem('map_' + m[newId]).then( ret => this._loadMapItem( {ret, ...params } ) );
    }
    return this._noItemFound( {ret, ...params } );
  }
  remove(params) {
    return this._mapPromise.then(() => {
      let m = this._m;
      let { key, id } = params;

      if(id === undefined) {
        if(this.enableCache && this.cache[key]) {
          delete this.cache[key];
        }
        return this.removeItem(key);
      }
      let newId = this._getId(key, id);

      //remove existed data
      if(m[newId] !== undefined) {
        if(this.enableCache && this.cache[newId]) {
          delete this.cache[newId];
        }
        this._removeIdInKey(key, id);
        let idTobeDeleted = m[newId];
        delete m[newId];
        this.setItem('map', JSON.stringify(m));
        return this.removeItem('map_' + idTobeDeleted);
      }
    });
  }
  _removeIdInKey(key, id) {
    let indexTobeRemoved = (this._m.__keys__[key] || []).indexOf(id);
    if (indexTobeRemoved !== -1) {
      this._m.__keys__[key].splice(indexTobeRemoved, 1);
    }
  }
  load(params) {
    let { key, id, autoSync = true, syncInBackground = true, syncParams, batched = false } = params;
    return this._mapPromise.then(() => new Promise((resolve, reject) => {
      if(id === undefined) {
        return resolve(this._lookupGlobalItem({
          key, resolve, reject, autoSync, syncInBackground, syncParams
        }));
      }
      return resolve(this._lookUpInMap({
        key, id, resolve, reject, autoSync, syncInBackground, syncParams, batched
      }));
    }));
  }
  clearMap() {
    this.removeItem('map').then(() => {
      this.cache = {};
      this._m = this._initMap();
    });
  }
  clearMapForKey(key) {
    return this._mapPromise.then(() => {
      let tasks = (this._m.__keys__[key] || []).map(id => this.remove({ key, id }));
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
