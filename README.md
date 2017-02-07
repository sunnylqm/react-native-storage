# react-native-storage [![Build Status](https://travis-ci.org/sunnylqm/react-native-storage.svg)](https://travis-ci.org/sunnylqm/react-native-storage)  [![npm version](https://badge.fury.io/js/react-native-storage.svg)](http://badge.fury.io/js/react-native-storage)

This is a local storage wrapper for both react-native(AsyncStorage) and browser(localStorage). [ES6](http://babeljs.io/docs/learn-es2015/) syntax, promise for async load, fully tested with jest.

查看中文文档[请点击README-CHN.md](README-CHN.md)

## Install

	npm install react-native-storage --save

## Usage

### Config
#### For Web
You need to use [webpack](http://webpack.github.io/) and [babel](https://babeljs.io/) to enable es6 modules for web development.   
You should add the following lines to your webpack config:  

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
You don't have to configure anything(but require react native version >= 0.13).
 

### Import

```bash
import Storage from 'react-native-storage';
```  

Do not use `require('react-native-storage')`, which would cause error in react native version >= 0.16.

### Init

```js
import { AsyncStorage } from 'react-native';

var storage = new Storage({
	// maximum capacity, default 1000 
	size: 1000,

	// Use AsyncStorage for RN, or window.localStorage for web.
	// If not set, data would be lost after reload.
	storageBackend: AsyncStorage,
	
	// expire time, default 1 day(1000 * 3600 * 24 milliseconds).
	// can be null, which means never expire.
	defaultExpires: 1000 * 3600 * 24,
	
	// cache data in the memory. default is true.
	enableCache: true,
	
	// if data was not found in storage or expired,
	// the corresponding sync method will be invoked and return 
	// the latest data.
	sync : {
		// we'll talk about the details later.
	}
})	

// I suggest you have one(and only one) storage instance in global scope.

// for web
// window.storage = storage;

// for react native
// global.storage = storage;
```

### Save & Load & Remove

```js
// Save something with key only. 
// Something more unique, and constantly being used.
// They are permanently stored unless you remove.
storage.save({
	key: 'loginState',   // Note: Do not use underscore("_") in key!
	rawData: { 
		from: 'some other site',
		userid: 'some userid',
		token: 'some token'
	},
	
	// if not specified, the defaultExpires will be applied instead.
	// if set to null, then it will never expire.
	expires: 1000 * 3600
});

// load
storage.load({
	key: 'loginState',
	
	// autoSync(default true) means if data not found or expired,
	// then invoke the corresponding sync method
	autoSync: true,
	
	// syncInBackground(default true) means if data expired,
	// return the outdated data first while invoke the sync method.
	// It can be set to false to always return data provided by sync method when expired.(Of course it's slower)
	syncInBackground: true,
	
	// you can pass extra params to sync method
	// see sync example below for example
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

// Save something with key and id. Something of the same type(key). 
// There is a quota over "key-id" data(the size parameter you pass in constructor).
// By default the 1001th data will overwrite the 1st data. 
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
	id: '1001',	  // Note: Do not use underscore("_") in id!	
	rawData: userA,
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

// getIdsForKey
storage.getIdsForKey('user').then(ids => {
    console.log(ids);
});

// getAllDataForKey
storage.getAllDataForKey('user').then(users => {
    console.log(users);
});

// !! clear all data under a key
storage.clearMapForKey('user');


// --------------------------------------------------  

// remove single record
storage.remove({
	key: 'lastPage'
});
storage.remove({
	key: 'user',
	id: '1001'
});

// !! clear map and remove all key-id data (but keep the key-only data)
storage.clearMap();
```

### Sync remote data(refresh)
You can pass sync methods as one object parameter to the storage constructor, but also you can add it any time.

```js
storage.sync = {

	// The name of the sync method must be the same of the data's key
	// And the passed params will be an all-in-one object.
	// You can use promise here. 
	// Or plain callback function with resolve/reject, like:
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
					rawData: json.user
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

With this example sync method, when you invoke:    

```js
storage.load({
	key: 'user',
	id: '1002'
}).then(...)
```

If there is no user 1002 stored currently, then storage.sync.user would be invoked to fetch remote data and returned.    

### Load batch data

```js
// Load batch data with the same parameters as storage.load, but in an array.
// It will invoke sync methods on demand, 
// and finally return them all in an ordered array.

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

There is a notable difference between the two methods except the arguments. **getBatchData** will invoke different sync methods(since the keys may be different) one by one when corresponding data is missing. However, **getBatchDataWithIds** will collect missing data, push their ids to an array, then pass the array to the corresponding sync method(to avoid too many requests) once, so you need to implement array query on server end and handle the parameters of sync method properly(cause the id parameter can be a single string or an array of strings).


#### You are welcome to ask any question in the [issues](https://github.com/sunnylqm/react-native-storage/issues) page.

### Changelog

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
