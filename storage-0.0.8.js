/*
 *  local storage(web/react native) wrapper
 *  sunnylqm 2015-09-01
 *  version 0.0.8
 */
let cache = {};
let m;
let _SIZE = 1000;
let _s;
let isBrowser = false;
if(window && window.localStorage){
  try {
    window.localStorage.setItem('test', 'test');
    _s = window.localStorage;
    isBrowser = true;
    m = JSON.parse(_s.getItem('map')) || { index: 0 };
  }
  catch(e){
    console.warn(e);
  }
}
else{
  _s = require('react-native').AsyncStorage;
  _s.getItem('map').then( map => {
    m = JSON.parse(map) || { index: 0 };
  });
}
class Storage {
  static get cache(){
    return cache;
  }
  static get _s() {
    return _s;
  }
  static get _SIZE() {
    return _SIZE;
  }
  static set _SIZE(newSize) {
    _SIZE = newSize;
  }
  static _saveToMap(id, d) {
    let s = Storage._s;
    if(m[id]){
      s.setItem('map_' + m[id],d);
    }
    else{
      if(++m.index === Storage._SIZE){
        m.index = 1;
      }
      m[id] = m.index;
      s.setItem('map_' + m.index, d);
      s.setItem('map', JSON.stringify(m));
    }
  }
  static save(id, rawData, global, expires){
    let s = Storage._s, d;
    if(s){
      let data = {
        rawData
      };
      let now = new Date().getTime();
      if(expires === undefined){
        expires = 24*3600*1000;
        //expires = 1000*60;
      }
      if(expires !== null){
        data.expires = now + expires;
      }
      d = JSON.stringify(data);
      if(global){
        s.setItem(id, d);
      }
      else{
        Storage._saveToMap(id, d);
        //if(isBrowser){
        //  let m = Storage.cache.map || (Storage.cache.map = JSON.parse(s.getItem('map')));
        //  Storage._saveToMap(m, id, d);
        //}
        //else{
        //  s.getItem('map').then( m => {
        //    Storage._saveToMap(JSON.parse(m), id, d);
        //  })
        //}

      }
    }
  }
  static getBatchDataWithKeys(keys){
    //全局存储，不循环
    let global = true;
    let tasks = [];
    for(let i = 0, key; key = keys[i]; i++){
      if(!Storage.cache[key]){
        //含_字符，循环存储
        global = (key.indexOf('_') === -1);
        tasks[i] = Storage.load(key, global);
      }
      else{
        tasks[i] = Storage.cache[key];
      }
    }
    return new Promise((resolve, reject) => {
      Promise.all(tasks).then(values => {
        resolve(values);
      }).catch(() => {
        reject();
      })
    })
  }
  static getBatchDataWithIds(key, ids){
    let tasks = [];
    for(var i = 0, id; id = ids[i]; i++){
      tasks[i] = Storage.load(key + '_' + id, false, false);
    }
    return new Promise((resolve, reject) => {
      let missed = [];
      Promise.all(tasks).then(values => {
        values = values.filter(value =>{
          if(value.syncId !== undefined){
            missed.push(value.syncId);
            return false;
          }
          else{
            return true;
          }
        });
        if(missed.length){
          Storage.sync[key](missed, data => {
            resolve(values.concat(data));
          }, reject);
        }
        else{
          resolve(values);
        }
      }).catch(() => {
        reject();
      })
    })
  }
  static _loadGlobalItem(id, ret, resolve, reject){
    if(ret === null || ret === 'undefined'){
      if(Storage.sync[id]){
        Storage.sync[id](resolve, reject);
      }
      else{
        reject();
      }
    }
    else{
      ret = JSON.parse(ret);
      if(ret.expires < new Date().getTime()){
        Storage.sync[id] && Storage.sync[id]();
      }
      resolve(ret.rawData);
    }
  }
  static _noItemFound(kv, resolve, reject, autoSync){
    if(kv.length > 1 && Storage.sync[kv[0]]){
      if(autoSync){
        Storage.sync[kv[0]](kv[1], resolve, reject);
      }
      else{
        resolve({
          syncId: kv[1]
        });
      }
    }
    else{
      reject();
    }
  }
  static _loadMapItem(ret, kv, resolve, reject, autoSync){
    if(ret === null || ret === 'undefined'){
      Storage._noItemFound(kv, resolve, reject, autoSync);
    }
    else{
      ret = JSON.parse(ret);
      if(ret.expires < new Date().getTime()){
        if(autoSync && kv.length > 1 && Storage.sync[kv[0]]) {
          Storage.sync[kv[0]](kv[1]);
        }
        else{
          resolve({
            syncId: kv[1]
          });
          return;
        }
      }
      resolve(ret.rawData);
    }
  }
  static _lookUpInMap(id, resolve, reject, autoSync){
    let s = Storage._s,
      kv = id.split('_'),
      ret;
    if(m[id] !== undefined){
      if(isBrowser){
        ret = s.getItem('map_' + m[id]);
        Storage._loadMapItem(ret, kv, resolve, reject, autoSync);
      }
      else{
        s.getItem('map_' + m[id]).then( ret => {
          Storage._loadMapItem(ret, kv, resolve, reject, autoSync);
        })
      }
    }
    else{
      Storage._noItemFound(kv, resolve, reject, autoSync);
    }
  }
  static load(id, global, autoSync = true){
    let s = Storage._s,
      ret;
    let promise = new Promise((resolve, reject) => {
      if(global){
        if(isBrowser){
          ret = s.getItem(id);
          Storage._loadGlobalItem(id, ret, resolve, reject);
        }
        else{
          s.getItem(id).then(ret => {
            Storage._loadGlobalItem(id, ret, resolve, reject);
          })
        }
      }
      else{
        Storage._lookUpInMap(id, resolve, reject, autoSync);
        //if(isBrowser){
        //  let m = JSON.parse(s.getItem('map'));
        //  Storage._lookUpInMap(m, id, resolve, reject, autoSync);
        //}
        //else{
        //  s.getItem('map').then( m => {
        //    Storage._lookUpInMap(JSON.parse(m), id, resolve, reject, autoSync);
        //  })
        //}

      }
    });
    return promise;
  }
  static clearMap(){
    let s = Storage._s;
    s.removeItem('map');
    m = { index: 0 };
    //var s = Storage._s,
    //    m = JSON.parse(s.getItem('map'));
    //if(m){
    //    for(var i = 1;i <= m.index;i++){
    //        s.removeItem('map_' + i);
    //    }
    //    m.index = 0;
    //}
  }
  static getGlobal(key){
    if(!Storage.cache[key]){
      Storage.load(key, true).then(ret => {
        Storage.cache[key] = ret;
      })
    }
    return Storage.cache[key];
  }
  static setGlobal(key, value, expires = null){
    Storage.save(key, value, true, expires);
    Storage.cache[key] = value;
  }
  static removeGlobal(key){
    Storage._s.removeItem(key);
    delete Storage.cache[key];
  }
}
module.exports = Storage;
//Storage.sync = {
  //TODO  implement your own sync methods like the following.
  //TODO  Do not forget append **resolve** and **reject**

  //user(id, resolve, reject){
  //  fetch('user/', {
  //    method: 'GET',
  //    body: 'id=' + id
  //  }).then(function(response) {
  //    return response.json();
  //  }).then(function(data) {
  //    //console.info(data);
  //    if(data && data.user){
  //      data = data.user;
  //      Storage.save('user_' + data.id, data);
  //      resolve && resolve(data);
  //    }
  //    else{
  //      reject && reject();
  //    }
  //  }).catch((error) => {
  //    console.warn(error);
  //  });
  //}
//}
