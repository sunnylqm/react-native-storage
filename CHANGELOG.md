### Changelog

#### 1.0.1

1. Fix getAllDataForKey crash.
2. Fix babel config for web compatiblity.

#### 1.0.0

1. Refactor code.
2. Complete tests.
3. Provide types.
4. Provide prebuilt lib for web.

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
