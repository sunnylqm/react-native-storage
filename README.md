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
  externals: {
    "react-native": {}     // This line is required! Otherwise an error would be thrown.
  },
  module: {
    loaders: [
      // ...
        {
          test: /\.js?$/,
          include: [
            //path.join(__dirname, 'your-own-js-files'),      
            //path.join(__dirname, 'node_modules/some-other-lib-that-needs-babel'),
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

Do not use `require('react-native-storage')`, which would cause error in version 0.16.

### Init

```js
var storage = new Storage({
	// maximum capacity, default 1000 
	size: 1000,    
	
	// expire time, default 1 day(1000 * 3600 * 24 secs)
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
// They are perminently stored unless you remove.
// Even expires, the data won't be removed. Only sync method would be invoked.
storage.save({
	key: 'loginState',   // Note: Do not use underscore("_") in key!
	rawData: { 
		from: 'some other site',
		userid: 'some userid',
		token: 'some token'
	},
	
	// if not specified, the defaultExpires will be applied instead.
	// if set to null, then it will never expires.
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
	syncInBackground: true
}).then( ret => {
	// found data goes to then()
	console.log(ret.userid);
}).catch( err => {
	// any exception including data not found 
	// goes to catch()
	console.warn(err);
})

// --------------------------------------------------

// Save something with key and id. Something of the same type(key). 
// There is a quota over "key-id" data(the size parameter you pass in constructor).
// By default the 1001th data will overwrite the 1st data. 
// If you then load the 1st data, a catch(data not found) or sync will be invoked.
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
	key: 'user'
	id: '1001'
}).then( ret => {
	// found data goes to then()
	console.log(ret.userid);
}).catch( err => {
	// any exception including data not found 
	// goes to catch()
	console.warn(err);
})

// --------------------------------------------------  

//remove single record
storage.remove({
	key: 'lastPage'
});
storage.remove({
	key: 'user'
	id: '1001'
});

//!! clear map and remove all key-id data (but keep the key-only data)
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
		let { id, resolve, reject } = params;
		fetch('user/', {
			method: 'GET',
			body: 'id=' + id
		}).then( response => {
			return response.json();
		}).then( json => {
			// console.log(json);
			if(json && json.user){
				storage.save({
					key: 'user',
					id,
					rawData: json.user
				});
				// Call resolve() when succeed
				resolve && resolve(json.user);
			}
			else{
				// Call reject() when failed
				reject && reject('data parse error');
			}
		}).catch( err => {
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
.then( results => {  
	results.forEach( result => {
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

####You are welcome to ask any question in the [issues](https://github.com/sunnylqm/react-native-storage/issues) page. 

### Changelog
__Caution: UPGRADEING MAY DROP ALL KEY-ID DATA (DUE TO MAP STRUCTURE CHANGES)!__

#### 0.0.10  
1. All methods except remove and clearMap are now totally promisified. Even custom sync methods can be promise. So you can chain them now. 
2. This version changed map structure, so unfortunately all exsiting key-id data would be dropped after upgrading.
3. Improved some test cases.
