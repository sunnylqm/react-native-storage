/*
 *  local storage(web/react native) wrapper
 *  sunnylqm 2015-10-01
 *  version 0.0.9
 */

export default class Storage {
  constructor(options = {}) {
    let me = this;

    me._SIZE = options.size || 1000;   // maximum capacity
    me.sync = options.sync || {};      // remote sync method
    me.defaultExpires = options.defaultExpires || 1000 * 3600 * 24;
    me.enableCache = options.enableCache || true;
    me._innerVersion = 9;
    me.cache = {};

    //detect browser or ios javascriptCore
    me.isBrowser = false;
    if(window && window.localStorage) {
      try {
        window.localStorage.setItem('test', 'test');
        me._s = window.localStorage;
        me.isBrowser = true;
        me._m = me._checkMap(JSON.parse(me._s.getItem('map')));
      }
      catch(e) {
        console.warn(e);
        throw e;
      }
    }
    else {
      me.readyQueue = [];
      me._s = require('react-native').AsyncStorage;
      me._s.getItem('map').then( map => {
        me._m = me._checkMap(JSON.parse(map));
        me.onReady();
      });
    }
  }
  onReady() {
    let me = this;
    let rq = me.readyQueue;
    for(let i = 0, task; task = rq[i++];) {
      me[task.method](task.params);
    }
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
    let me = this,
      s = me._s,
      m = me._m;
    if(!m) {
      return me.readyQueue.push({
        method: '_saveToMap',
        params
      });
    }
    let { key, id, data } = params;

    //join key and id
    let newId = me._getId(key, id);

    //update existed data
    if(m[newId]) {
      s.setItem('map_' + m[newId], data);
    }
    //create new data
    else {
      if(m[m.index] !== undefined){
        //loop over, delete old data
        let oldId = m[m.index];
        delete m[oldId];
        if(me.enableCache) {
          delete me.cache[oldId];
        }
      }
      m[newId] = m.index;
      m[m.index] = newId;
      if(me.enableCache) {
        const cacheData = JSON.parse(data);
        me.cache[newId] = cacheData;
      }
      s.setItem('map_' + m.index, data);
      s.setItem('map', JSON.stringify(m));
      if(++m.index === me._SIZE) {
        m.index = 0;
      }
    }
  }
  save(params) {
    let me = this,
      s = me._s;
    let { key, id, rawData, expires } = params;
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
      s.setItem(key, data);
    }
    else {
      me._saveToMap({
        key,
        id,
        data
      });
    }
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
    return new Promise((resolve, reject) => {
      Promise.all(tasks).then(values => {
        resolve(values);
      }).catch(() => {
        reject();
      })
    })
  }
  getBatchDataWithIds(params) {
    let me = this;
    let { key, ids, syncInBackground } = params;
    let tasks = [];
    for(var i = 0, id; id = ids[i]; i++) {
      tasks[i] = me.load({ key, id, syncInBackground, autoSync: false, batched: true });
    }
    return new Promise((resolve, reject) => {
      let missed = [];
      Promise.all(tasks).then(values => {
        values = values.filter(value => {
          if(value.syncId !== undefined) {
            missed.push(value.syncId);
            return false;
          }
          else {
            return true;
          }
        });
        if(missed.length) {
          me.sync[key]({
            id : missed,
            resolve: data => {
              resolve(values.concat(data));
            },
            reject
          });
        }
        else {
          resolve(values);
        }
      }).catch(() => {
        reject();
      })
    })
  }
  _lookupGlobalItem(params) {
    let me = this,
      s = me._s,
      ret;
    let { key } = params;
    if(me.enableCache && me.cache[key] !== undefined) {
      ret = me.cache[key];
      me._loadGlobalItem({ ret, ...params });
    }
    else {
      if(me.isBrowser) {
        ret = s.getItem(key);
        me._loadGlobalItem({ ret, ...params });
      }
      else {
        s.getItem(key).then(ret => {
          me._loadGlobalItem({ ret, ...params });
        })
      }
    }
  }
  _loadGlobalItem(params) {
    let me = this;
    let { key, ret, resolve, reject, autoSync, syncInBackground } = params;
    if(ret === null || ret === undefined) {
      if(autoSync && me.sync[key]) {
        me.sync[key]({resolve, reject});
      }
      else {
        reject();
      }
    }
    else {
      if(typeof ret === 'string') {
        ret = JSON.parse(ret);
      }
      let now = new Date().getTime();
      if(autoSync && ret.expires < now && me.sync[key]) {
        if(syncInBackground) {
          me.sync[key]({});
        }
        else {
          me.sync[key]({resolve, reject});
          return;
        }
      }
      resolve(ret.rawData);
    }
  }
  _noItemFound(params) {
    let me = this;
    let { key, id, resolve, reject, autoSync } = params;
    if(me.sync[key]) {
      if(autoSync) {
        me.sync[key]({id, resolve, reject});
      }
      else {
        resolve({
          syncId: id
        });
      }
    }
    else {
      reject();
    }
  }
  _loadMapItem(params) {
    let me = this;
    let { ret, key, id, resolve, reject, autoSync, batched, syncInBackground } = params;
    if(ret === null || ret === undefined) {
      me._noItemFound(params);
    }
    else {
      if(typeof ret === 'string'){
        ret = JSON.parse(ret);
      }
      let now = new Date().getTime();
      if(autoSync && ret.expires < now) {
        if(me.sync[key]) {
          if(syncInBackground){
            me.sync[key]({id});
          }
          else{
            me.sync[key]({id, resolve, reject});
            return;
          }
        }
        else if(batched) {
          resolve({
            syncId: id
          });
          return;
        }
      }
      resolve(ret.rawData);
    }
  }
  _lookUpInMap(params) {
    let me = this,
      s = me._s,
      m = me._m,
      ret;
    let { key, id } = params;
    let newId = me._getId(key, id);
    if(me.enableCache && me.cache[newId]) {
      ret = me.cache[newId];
      me._loadMapItem( {ret, ...params } );
    }
    else if(m[newId] !== undefined) {
      if(me.isBrowser) {
        ret = s.getItem('map_' + m[newId]);
        me._loadMapItem( {ret, ...params } );
      }
      else {
        s.getItem('map_' + m[newId]).then( ret => {
          me._loadMapItem( {ret, ...params } );
        })
      }
    }
    else {
      me._noItemFound( {ret, ...params } );
    }
  }
  remove(params) {
    let me = this,
      m = me._m,
      s = me._s;
    let { key, id } = params;
    if(!m) {
      me.readyQueue.push({
        method: 'remove',
        params
      });
    }
    else if(id === undefined) {
      if(me.enableCache && me.cache[key]) {
        delete me.cache[key];
      }
      s.removeItem(key);
    }
    else {
      //join key and id
      let newId = me._getId(key, id);

      //remove existed data
      if(m[newId]) {
        if(me.enableCache && me.cache[newId]) {
          delete me.cache[newId];
        }
        delete m[newId];
        s.removeItem('map_' + m[newId]);
      }
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
        if(!m) {
          me.readyQueue.push({
            method: '_lookupGlobalItem',
            params: {key, resolve, reject, autoSync, syncInBackground}
          });
        }
        else {
          me._lookupGlobalItem({key, resolve, reject, autoSync, syncInBackground});
        }
      }
      else {
        if(!m) {
          me.readyQueue.push({
            method: '_lookUpInMap',
            params: {key, id, resolve, reject, autoSync, syncInBackground}
          });
        }
        else {
          me._lookUpInMap({key, id, resolve, reject, autoSync, syncInBackground});
        }
      }
    });
    return promise;
  }
  clearMap(){
    let me = this,
      s = me._s;
    s.removeItem('map');
    me._m = {
      innerVersion: me._innerVersion,
      index: 0
    };
  }
}
