/**
 * Created by sunny on 15/10/5.
 */
jest.dontMock('../src/error.js');
jest.dontMock('../src/storage.js');

import Storage from '../storage';
let storage = new Storage();
let localStorage = new Storage({
  storageBackend: window.localStorage
});
let asyncStorage = new Storage({
  storageBackend: window.asyncStorage
});
let stores = { localStorage, asyncStorage };

describe('react-native-storage: batch and sync test', () => {
  Object.keys(stores).map(storageKey => {
    let storage = stores[storageKey];
    test('triggers sync when no data found' + `(${storageKey})`, () => {
      let testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        syncData = 'syncData';
      let sync1 = jest.fn(params => {
        let {resolve} = params;
        resolve && resolve(syncData);
      });
      let sync2 = jest.fn(params => {
        let {id, resolve} = params;
        resolve && resolve(syncData + id);
      });
      storage.sync[testKey1] = sync1;
      storage.sync[testKey2] = sync2;

      return Promise.all([
        //key not found
        storage.load({
          key: testKey1
        }),
        //key and id not found
        storage.load({
          key: testKey2,
          id: testId2
        })
      ]).then(([ret1, ret2]) => {
        expect(ret1).toBe(syncData);
        expect(sync1.mock.calls.length).toBe(1);
        expect(sync2.mock.calls.length).toBe(1);
        expect(ret2).toBe(syncData + testId2);
      });
    });
    test('does not trigger sync when data found and do not expire' + `(${storageKey})`, () => {
      let testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        testData1 = 'testData1',
        testData2 = 'testData2',
        syncData = 'syncData';
      let sync1 = jest.fn(params => {
        let {resolve} = params;
        resolve && resolve(syncData);
      });
      let sync2 = jest.fn(params => {
        let {id, resolve} = params;
        resolve && resolve(syncData + id);
      });
      storage.sync[testKey1] = sync1;
      storage.sync[testKey2] = sync2;

      //save data, expires in long time
      storage.save({
        key: testKey1,
        data: testData1,
        expires: 10000
      });
      storage.save({
        key: testKey2,
        id: testId2,
        data: testData2,
        expires: 10000
      });

      //instantly load
      return Promise.all([
        storage.load({
        key: testKey1
      }),
      storage.load({
        key: testKey2,
        id: testId2
      })
      ]).then(([ret1, ret2]) => {
        expect(ret1).toBe(testData1);
        expect(sync1.mock.calls.length).toBe(0);
        expect(sync2.mock.calls.length).toBe(0);
        expect(ret2).toBe(testData2);
      });
    });
    test('triggers sync when data expires but still returns outdated data(syncInBackground: true)' + `(${storageKey})`, () => {
      let testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        testData1 = 'testData1',
        testData2 = 'testData2',
        syncData = 'syncData';
      let sync1 = jest.fn(params => {
        let {resolve} = params;
        resolve && resolve(syncData);
      });
      let sync2 = jest.fn(params => {
        let {id, resolve} = params;
        resolve && resolve(syncData + id);
      });
      storage.sync[testKey1] = sync1;
      storage.sync[testKey2] = sync2;

      //save data, expires in no time
      storage.save({
        key: testKey1,
        data: testData1,
        expires: -1
      });
      storage.save({
        key: testKey2,
        id: testId2,
        data: testData2,
        expires: -1
      });

      //instantly load
      return Promise.all([
        storage.load({
        key: testKey1
      }),
      storage.load({
        key: testKey2,
        id: testId2
      })
      ]).then(([ret1, ret2]) => {
        expect(ret1).toBe(testData1);
        expect(sync1.mock.calls.length).toBe(1);

        expect(ret2).toBe(testData2);
        expect(sync2.mock.calls.length).toBe(1);
      });
    });
    test('triggers sync when data expires and returns latest data(syncInBackground: false)' + `(${storageKey})`, () => {
      let testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        testData1 = 'testData1',
        testData2 = 'testData2',
        syncData = 'syncData';
      let sync1 = jest.fn(params => {
        let {resolve} = params;
        resolve && resolve(syncData);
      });
      let sync2 = jest.fn(params => {
        let {id, resolve} = params;
        resolve && resolve(syncData + id);
      });
      storage.sync[testKey1] = sync1;
      storage.sync[testKey2] = sync2;

      //save data, expires in no time
      storage.save({
        key: testKey1,
        data: testData1,
        expires: -1
      });
      storage.save({
        key: testKey2,
        id: testId2,
        data: testData2,
        expires: -1
      });

      //instantly load
      return Promise.all([
        storage.load({
          key: testKey1,
          syncInBackground: false
        }),
        storage.load({
          key: testKey2,
          id: testId2,
          syncInBackground: false
        })
      ]).then(([ret1, ret2]) => {
        expect(ret1).toBe(syncData);
        expect(sync1.mock.calls.length).toBe(1);

        expect(ret2).toBe(syncData + testId2);
        expect(sync2.mock.calls.length).toBe(1);
      });

    });
    test('returns batch data with batch keys' + `(${storageKey})`, () => {
      let testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testKey3 = 'testKey3' + Math.random(),
        testData1 = 'testData1',
        testData2 = 'testData2',
        testData3 = 'testData3';
      let sync3 = jest.fn(params => {
        let {resolve} = params;
        resolve && resolve(testData3);
      });
      storage.sync[testKey3] = sync3;

      //save key1 and key2
      storage.save({
        key: testKey1,
        data: testData1
      });
      storage.save({
        key: testKey2,
        data: testData2
      });

      //instantly load
      return storage.getBatchData([
        {key: testKey1},
        {key: testKey2},
        {key: testKey3}
      ]).then((ret) => {
        expect(ret[0]).toBe(testData1);
        expect(ret[1]).toBe(testData2);
        expect(ret[2]).toBe(testData3);
        expect(sync3.mock.calls.length).toBe(1);
      });
    });
    test('returns batch data with batch ids' + `(${storageKey})`, () => {
      let testKey = 'testKey' + Math.random(),
        testId1 = 'testId1' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        testId3 = 'testId3' + Math.random(),
        testData1 = 'testData1',
        testData2 = 'testData2',
        testData3 = 'testData3';
      let sync = jest.fn(params => {
        let {resolve} = params;
        // when id is an array, the return value should be an ordered array too
        resolve && resolve([testData3]);
      });
      storage.sync[testKey] = sync;
      //save id1 and id2
      storage.save({
        key: testKey,
        id: testId1,
        data: testData1
      });
      storage.save({
        key: testKey,
        id: testId2,
        data: testData2
      });

      //instantly load
      return storage.getBatchDataWithIds({
        key: testKey,
        ids: [testId1, testId2, testId3]
      }).then(ret => {
        expect(ret[0]).toBe(testData1);
        expect(ret[1]).toBe(testData2);
        expect(ret[2]).toBe(testData3);
        expect(JSON.stringify(sync.mock.calls[0][0].id)).toBe(JSON.stringify([testId3]));
      });
    });
  })
});
