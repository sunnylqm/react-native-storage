# react-native-storage
This is a local storage wrapper for both react-native(AsyncStorage) and browser(localStorage). [ES6](http://babeljs.io/docs/learn-es2015/) syntax, promise for async load, fully tested with jest.    
You may need a [Promise polyfill](https://github.com/jakearchibald/es6-promise) for [legacy iOS devices/browsers](http://caniuse.com/#search=promise).

这是一个本地持久存储的封装，可以同时支持react-native(AsyncStorage)和浏览器(localStorage)。ES6语法，promise异步读取，使用jest进行了完整的单元测试。由于代码使用ES6语法编写，因而需要[babel库](http://babeljs.io/docs/setup/#browserify)的支持。
如果iOS设备或浏览器版本较老（不支持[Promise](http://caniuse.com/#search=promise)）,则还需要一个Promise的[兼容库](https://github.com/jakearchibald/es6-promise)。

## Install 安装
	npm install react-native-storage --save
	

## Usage 使用说明
### Config 配置
You need to use [babel](https://babeljs.io/) to enable es6 modules for web development(I'll provide an example in the next version). For React-Native development, put this [babel config file](https://github.com/brentvatne/react-native-animated-demo-tinder/blob/master/.babelrc) under your project directory.
   
对于Web开发你需要使用[babel](https://babeljs.io/)来支持es6模块导入功能。    
如果是React-Native开发，把这个[babel配置文件](https://github.com/brentvatne/react-native-animated-demo-tinder/blob/master/.babelrc)放到你的项目根目录中即可。    

### Import 导入
	var Storage = require('react-native-storage');

or 或者

	import Storage from 'react-native-storage';
	
### Init 初始化
	var storage = new Storage({
		//maximum capacity, default 1000 
		//最大容量，默认值1000条数据循环存储
		size: 1000,    
		
		//expire time, default 1 day(1000 * 3600 * 24 secs)
		//数据过期时间，默认一整天（1000 * 3600 * 24秒）
		defaultExpires: 1000 * 3600 * 24,
		
		//cache data in the memory. default is true.
		//读写时在内存中缓存数据。默认启用。
		enableCache: true,
		
		//if data was not found in storage or expired,
		//the corresponding sync method will be invoked and return 
		//the latest data.
		//如果storage中没有相应数据，或数据已过期，
		//则会调用相应的sync同步方法，无缝返回最新数据。
		sync : {
			//we'll talk about the details later.
			//同步方法的具体说明会在后文提到
		}
	})	
	
	//I suggest you have one(and only one) storage instance in global scope.
	//最好在全局范围内创建一个（且只有一个）storage实例，方便使用
	
	//for web
	//window.storage = storage;
	
	//for react native
	//global.storage = storage;
	
	//or CMD
	//module.exports = storage;

### Save & Load 保存和读取
	//Save something with key only. 
	//Something more unique, and constantly being used.
	//They are perminently stored unless you remove.
	//Even expires, the data won't be removed. Only sync method would be invoked.
	//使用key来保存数据。这些数据一般是全局独有的，常常需要调用的。
	//除非你手动移除，这些数据会被永久保存，而且默认不会过期。
	//即便指定了且达到了过期时间，数据也不会被删除，而只是触发调用同步方法。
	storage.save({
		key: 'loginState',
		rawData: { 
			from: 'some other site',
			userid: 'some userid',
			token: 'some token'
		},
		
		//if not specified, the defaultExpires will be applied instead.
		//if set to null, then it will never expires.
		//如果不指定过期时间，则会使用defaultExpires参数
		//如果设为null，则永不过期
		expires: 1000 * 3600
	});
	
	//load 读取
	storage.load({
		key: 'loginState',
		
		//autoSync(default true) means if data not found or expired,
		//then invoke the corresponding sync method
		//autoSync(默认为true)意味着在没有找到数据或数据过期时自动调用相应的同步方法
		autoSync: true,
		
		//syncInBackground(default true) means if data expired,
		//return the outdated data first while invoke the sync method.
		//It can be set to false to always return data provided by sync method when expired.(Of course it's slower)
		//syncInBackground(默认为true)意味着如果数据过期，
		//在调用同步方法的同时先返回已经过期的数据。
		//设置为false的话，则始终强制返回同步方法提供的最新数据(当然会需要更多等待时间)。
		syncInBackground: true
	}).then( ret => {					//found data goes to then()
		console.log(ret.userid);		//如果找到数据，则在then方法中返回
	}).catch( err => {					//any exception including data not found 
		console.warn(err);				//goes to catch()
										//如果没有找到数据且没有同步方法，
										//或者有其他异常，则在catch中返回
	})
	
	__________________________________________________________________
	
	//Save something with key and id. Something of the same type(key). 
	//There is a quota over "key-id" data(the size parameter you pass in constructor).
	//By default the 1001th data will overwrite the 1st data. 
	//If you then load the 1st data, a catch(data not found) or sync will be invoked.
	//使用key和id来保存数据，一般是保存同类别（key）的大量数据。
	//这些"key-id"数据有一个保存上限，即在初始化storage时传入的size参数。
	//在默认上限参数下，第1001个数据会覆盖第1个数据。
	//覆盖之后，再读取第1个数据，会返回catch或是相应的同步方法。
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
		key: 'user',
		id: '1001',		
		rawData: userA,
		expires: 1000 * 60	 
	});
	
	//load 读取
	storage.load({
		key: 'user'
		id: '1001'
	}).then( ret => {					//found data goes to then()
		console.log(ret.userid);		//如果找到数据，则在then方法中返回
	}).catch( err => {					//any exception including data not found 
		console.warn(err);				//goes to catch()
										//如果没有找到数据且没有同步方法，
										//或者有其他异常，则在catch中返回
	})


### Sync remote data(refresh) 同步远程数据（刷新）
You can pass sync methods as one object parameter to the storage constructor, but also you can add it any time.

	storage.sync = {
		//The name of the sync method must be the same of the data's key
		//And the passed params will be an all-in-one object.
		//同步方法的名字必须和所存数据的key完全相同
		//方法接受的参数为一整个object，所有参数从object中解构取出
		user(params){
			let { id, resolve, reject } = params;
			fetch('user/', {
				method: 'GET',
				body: 'id=' + id
			}).then( response => {
				return response.json();
			}).then( json => {
				//console.log(json);
				if(json && json.user){
					storage.save({
						key: 'user',
						id,
						rawData: json.user
					});
					resolve && resolve(json.user);
				}
				else{
					reject && reject('data parse error');
				}
			}).catch( err => {
				console.warn(err);
				reject && reject(err);
			});
		}
	}

With this example sync method, when you invoke:    

	storage.load({
		key: 'user',
		id: '1002'
	}).then(...)
If there is no user 1002 stored currently, then storage.sync.user would be invoked to fetch remote data and returned.    
有了上面这个sync方法，以后再调用storage.load时，如果本地并没有存储相应的user，那么会自动触发storage.sync.user去远程取回数据并无缝返回。


### Load batch data 读取批量数据

	//Load batch data with the same parameters as storage.load, but in an array.
	//It will invoke sync methods on demand, 
	//and finally return them all in an ordered array.
	//使用和load方法一样的参数读取批量数据，但是参数是以数组的方式提供。
	//会在需要时分别调用相应的同步方法，最后统一返回一个有序数组。
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
	
	//Load batch data with one key and an array of ids.
	//根据key和一个id数组来读取批量数据
	storage.getBatchDataWithIds({
		key: 'user', 
		ids: ['1001', '1002', '1003']
	})
	.then( ... )
	
There is a notable difference between the two methods except the arguments. **getBatchData** will invoke different sync methods(since the keys may be different) one by one when corresponding data is missing. However, **getBatchDataWithIds** will collect missing data, push their ids to an array, then pass the array to the corresponding sync method(to avoid too many requests) once, so you need to implement array query on server end and handle the parameters of sync method properly(cause the id parameter can be a single string or an array of strings).    
这两个方法除了参数形式不同，还有个值得注意的差异。**getBatchData**会在数据缺失时挨个调用不同的sync方法(因为key不同)。但是**getBatchDataWithIds**却会把缺失的数据统计起来，将它们的id收集到一个数组中，然后一次传递给对应的sync方法(避免挨个查询导致同时发起大量请求)，所以你需要在服务端实现通过数组来查询返回，还要注意对应的sync方法的参数处理（因为id参数可能是一个字符串，也可能是一个数组的字符串）。