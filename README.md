# react-native-storage
This is a local storage wrapper for both react-native(AsyncStorage) and browser(localStorage).[ES6/babel](https://babeljs.io/) is needed.    
You may need a [Promise polyfill](https://github.com/jakearchibald/es6-promise) for [legacy iOS devices/browsers](http://caniuse.com/#search=promise).

这是一个本地持久存储的封装，可以同时支持react-native(AsyncStorage)和浏览器(localStorage)。由于代码使用ES6语法编写，因而需要[babel库](https://babeljs.io/)的支持。
如果iOS设备或浏览器版本较老（不支持[Promise](http://caniuse.com/#search=promise)）,则还需要一个Promise的[兼容库](https://github.com/jakearchibald/es6-promise)。

## Usage 使用说明

### Save & Load 保存和读取
	Storage.save(id, data, global, expires)
	Storage.load(id, global).then( data => {
		console.info(data);
	}).catch(error){
		console.warn(error);
	}
Use these methods to save/load any legal type of javaScript data. It will automatically transform data into JSON string and vice versa.    
使用这两个方法来保存和读取任意合法类型的js数据。它们会自动转换JSON字符串或将JSON解析为数据对象。    
**Attention:** By default, there is a private property *map* which records indices of stored data. And it has a default SIZE of 1000, which means the capacity would be 1000 records. And if exceeded, new data would overwrite the first record without warnings(but won't cause disorder), to prevent the size from uncontrollable increasing. You can alter the SIZE using:    
  
	Storage.SIZE = 1500
	
注意：默认情况下，会使用一个**map**来记录所存数据的索引，其默认大小为1000。也就是说Storage的默认容量为1000条记录。如果超出了容量，那么新保存的数据就会在不提示的情况下覆盖第一条数据(但并不会引起数据紊乱)，以避免Storage占用的空间不可控地持续增大。你可以修改这个默认SIZE的大小。

Or if you don't want some long term data to be "recycled", then you can set the param **global** to be true, which gets your data stored out of the **map**. And when you load it, **global** should also be **true**.     
**Expires** has a default value of one whole day(24 * 3600 * 1000). When data expired, they won't be deleted but trigger a refresh operation if avaiable. Set it to *null* if you want it never expires.     
或者如果你不想有些长期存放的数据被“回收”，那么可以将**global**参数设置为true，这样它就不会被记录到map中，也就不会被回收。而当你读取这种不会被回收的数据时，也需要将load方法中的global参数设为true.    
**Expires**参数的默认值为一整天(24 * 3600 * 1000)。过期的数据不会被删除，而是会触发一个刷新的动作（需要你自己实现）。如果你希望某个数据永不过期，则将此参数设置为*null* 即可。


### Sync remote data 同步远程数据（刷新）
Following is an example. You must implement it yourself under Storage.sync.    
下面是一段示例代码。你必须在Storage.sync中自己实现。

	Storage.sync = {
	  user(id, resolve, reject){
       fetch('user/', {
         method: 'GET',
         body: 'id=' + id
         }).then(function(response) {
          return response.json();
         }).then(function(data) {
          //console.info(data);
	      if(data && data.user){
	        data = data.user;
	        Storage.save('user_' + data.id, data);
	        resolve && resolve(data);
	      }
	      else{
	        reject && reject();
	      }
	    }).catch((error) => {
	      console.warn(error);
	    });
	  }
	}

With this example sync method, when you invoke:    

	Storage.load('user_123').then(...)
If there is no user_123 stored currently, then Storage.sync.user would be triggered to fetch remote data and returned.    
有了上面这个sync方法，以后再调用Storage.load时，如果本地并没有存储相应的user，那么会自动触发Storage.sync.user去远程取回数据并无缝返回。


### Load batch data 读取批量数据
	Storage.getBatchDataWithKeys(keys)
	Storage.getBatchDataWithIds(key, ids)
	
These methods are ready to use, while the document is WIP(work in progress).   
以上两个方法已经可以使用，但具体说明待续。