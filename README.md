# react-native-storage [![Build Status](https://travis-ci.org/sunnylqm/react-native-storage.svg)](https://travis-ci.org/sunnylqm/react-native-storage)  [![npm version](https://badge.fury.io/js/react-native-storage.svg)](http://badge.fury.io/js/react-native-storage)

This is a local storage wrapper for both mobile React-Native apps (using AsyncStorage) and React browser-invoked web apps (using localStorage). [ES6](http://babeljs.io/docs/learn-es2015/) syntax, promise for async load, fully tested with jest.

查看中文文档[请点击README-CHN.md](README-CHN.md)

## Install

	npm install react-native-storage --save

## Usage

### Config
#### For Web
You need to use [webpack](http://webpack.github.io/) and [babel](https://babeljs.io/) to enable es6 modules for web development.   
Add the following lines to your webpack config:  

```javascript
  // ...
  module: {
    loaders: [
      // ...
        {
          test: /\.js?$/,
          include: [
            // path.join(__dirname, 'your-own-js-files'),
            // path.join(__dirname, 'node_modules/some-other-lib-that-needs-babel'),
            path.join(__dirname, 'node_modules/react-native-storage')
          ],
          loader: 'babel',
          query: {
            cacheDirectory: true,
            presets: ['es2015', 'stage-1', 'react'],
            plugins: ['transform-runtime']
          }
        }
    ]
  }

```  

#### For React Native
You don't have to configure anything (but React Native version >= 0.13 is required).
 

### Import

```bash
import Storage from 'react-native-storage';
```  

Do not use `require('react-native-storage')`, which will cause an error in react native version >= 0.16.

### Init

```js
import Storage from 'react-native-storage';
import { AsyncStorage } from 'react-native';

var storage = new Storage({
	// maximum capacity, default 1000 
	size: 1000,

	// Use AsyncStorage for RN apps, or window.localStorage for web apps.
	// If storageBackend is not set, data will be lost after reload.
	storageBackend: AsyncStorage, // for web: window.localStorage
	
	// expire time, default: 1 day (1000 * 3600 * 24 milliseconds).
	// can be null, which means never expire.
	defaultExpires: 1000 * 3600 * 24,
	
	// cache data in the memory. default is true.
	enableCache: true,
	
	// if data was not found in storage or expired data was found,
	// the corresponding sync method will be invoked returning 
	// the latest data.
	sync : {
		// we'll talk about the details later.
	}
})	

// I suggest you have one (and only one) storage instance in global scope.

// for web
// window.storage = storage;

// for react native
// global.storage = storage;
```

### Save & Load & Remove

```js
// Save something with key only. (using only a keyname but no id)
// This key should be unique. This is for data frequently used.
// The key and value pair is permanently stored unless you remove it yourself.
storage.save({
	key: 'loginState',   // Note: Do not use underscore("_") in key!
	data: { 
		from: 'some other site',
		userid: 'some userid',
		token: 'some token'
	},
	
	// if expires not specified, the defaultExpires will be applied instead.
	// if set to null, then it will never expire.
	expires: 1000 * 3600
});

// load
storage.load({
	key: 'loginState',
	
	// autoSync (default: true) means if data is not found or has expired,
	// then invoke the corresponding sync method
	autoSync: true,
	
	// syncInBackground (default: true) means if data expired,
	// return the outdated data first while invoking the sync method.
	// If syncInBackground is set to false, and there is expired data, 
	// it will wait for the new data and return only after the sync completed. 
	// (This, of course, is slower)
	syncInBackground: true,
	
	// you can pass extra params to the sync method
	// see sync example below
	syncParams: {
	  extraFetchOptions: {
	    // blahblah
	  },
	  someFlag: true,
	},
}).then(ret => {
	// found data go to then()
	console.log(ret.userid);
}).catch(err => {
	// any exception including data not found 
	// goes to catch()
	console.warn(err.message);
	switch (err.name) {
	    case 'NotFoundError':
	        // TODO;
	        break;
        case 'ExpiredError':
            // TODO
            break;
	}
})

// --------------------------------------------------

// Save something with key and id. 
// "key-id" data size cannot surpass the size parameter you pass in the constructor.
// By default the 1001st data will overwrite the 1st data item. 
// If you then load the 1st data, a catch(NotFoundError) or sync will be invoked.
var userA = {
	name: 'A',
	age: 20,
	tags: [
		'geek',
		'nerd',
		'otaku'
	]
};

storage.save({
	key: 'user',  // Note: Do not use underscore("_") in key!
	id: '1001',   // Note: Do not use underscore("_") in id!	
	data: userA,
	expires: 1000 * 60	 
});

// load
storage.load({
	key: 'user',
	id: '1001'
}).then(ret => {
	// found data goes to then()
	console.log(ret.userid);
}).catch(err => {
	// any exception including data not found 
	// goes to catch()
	console.warn(err.message);
	switch (err.name) {
	    case 'NotFoundError':
	        // TODO;
	        break;
        case 'ExpiredError':
            // TODO
            break;
	}
});

// --------------------------------------------------

// get all ids for "key-id" data under a key, 
// note: does not include "key-only" information (which has no ids) 
storage.getIdsForKey('user').then(ids => {
    console.log(ids);
});

// get all the "key-id" data under a key
// !! important: this does not include "key-only" data
storage.getAllDataForKey('user').then(users => {
    console.log(users);
});

// clear all "key-id" data under a key 
// !! important: "key-only" data is not cleared by this function
storage.clearMapForKey('user');


// --------------------------------------------------  

// remove a single record
storage.remove({
	key: 'lastPage'
});
storage.remove({
	key: 'user',
	id: '1001'
});

// clear map and remove all "key-id" data 
// !! important: "key-only" data is not cleared, and is left intact
storage.clearMap();
```

### Sync remote data(refresh)
There are two ways to set the sync method. 
You can pass the sync method in the constructor's parameter, as a function in an object, 
or you can define it at any time as shown below: 

```js
storage.sync = {

	// The name of the sync method must be the same as the data's key name
	// And the passed params will be an all-in-one object.
	// You can either use promise here, or a plain callback function with resolve/reject, like:
	user(params){
		let { id, resolve, reject, syncParams: { extraFetchOptions, someFlag } } = params;
		fetch('user/', {
			method: 'GET',
			body: 'id=' + id,
		    ...extraFetchOptions,
		}).then(response => {
			return response.json();
		}).then(json => {
			// console.log(json);
			if(json && json.user){
				storage.save({
					key: 'user',
					id,
					data: json.user
				});
				
				if (someFlag) {
				  // do something for this extra param
				}
				
				// Call resolve() when succeed
				resolve && resolve(json.user);
			}
			else{
				// Call reject() when failed
				reject && reject(new Error('data parse error'));
			}
		}).catch(err => {
			console.warn(err);
			reject && reject(err);
		});
	}
}
```

In the following example the sync method is called, when you invoke `storage.load`:    

```js
storage.load({
	key: 'user',
	id: '1002'
}).then(...)
```

If there is no user 1002 currently in storage, then storage.sync.user will be invoked to fetch and return the remote data.    

### Load batch data

```js
// Load batch data with an array of `storage.load` parameters.
// It will invoke each key's sync method, 
// and when all are complete will return all the data in an ordered array.
// The sync methods behave according to the syncInBackground setting: (default true)
// When set to true (the default), if timed out will return the current value 
// while when set to false, will wait till the sync method completes

storage.getBatchData([
	{ key: 'loginState' },
	{ key: 'checkPoint', syncInBackground: false },
	{ key: 'balance' },
	{ key: 'user', id: '1009' }
])
.then(results => {
	results.forEach(result => {
		console.log(result); 
	})
})

// Load batch data with one key and an array of ids.
storage.getBatchDataWithIds({
	key: 'user', 
	ids: ['1001', '1002', '1003']
})
.then( ... )
```

There is an important  difference between the way these two methods perform:
**getBatchData** will invoke separate sync methods for each different key one after the other when the corresponding data is missing or not in sync. However, **getBatchDataWithIds** will collect a list of the missing data, pushing their ids to an array, and then pass the array to the single corresponding sync method once, reducing the number of requests, so you need to implement array query on the server side and handle the parameters of sync method properly. Note that the id parameter can be a single string or an array of strings.


#### You are welcome to ask any question in the [issues](https://github.com/sunnylqm/react-native-storage/issues) page.

### Changelog

#### 0.2.2
1. check key availability in clearMapForKey

#### 0.2.0
1. `rawData` is now deprecated, use "data" instead!
2. Upgrade jest to 19.0.0

#### 0.1.5
1. Now you can pass extra params to sync method.
2. Fix clearMap

#### 0.1.4
1. Now you can check error type (NotFoundError and ExpiredError) in catch
2. Optimize cache strategy

#### 0.1.3
1. Now you need to specify storageBackend(AsyncStorage or window.localStorage), otherwise the data would not be persisted.

#### 0.1.2
1. Now when load() failed to find data, it will throw an Error with message instead of undefined.

#### 0.1.1
1. `defaultExpires` can be `null` now, which means never expire.

#### 0.1.0
1. add getIdsForKey, getAllDataForKey, clearMapForKey methods
2. fix some expires logic
3. refactor unit tests

#### 0.0.16
1. getBatchDataWithIds now won't invoke sync if everything is ready in storage.

#### 0.0.15
1. Fix bugs in promise chain.
2. Can be used without any storage backend.(Use in-memory map)

#### 0.0.10  
1. All methods except remove and clearMap are now totally promisified. Even custom sync methods can be promise. So you can chain them now. 
2. Adjust map structure.
3. Improved some test cases.
