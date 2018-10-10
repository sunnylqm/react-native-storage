/**
 * Created by sunny on 15/10/5.
 */

import Storage from '../src/storage';
const localStorage = new Storage({
  storageBackend: global.localStorage
});
const asyncStorage = new Storage({
  storageBackend: global.asyncStorage
});
const stores = { localStorage, asyncStorage };

describe('react-native-storage: batch and sync test', () => {
  Object.keys(stores).map(storageKey => {
    const storage = stores[storageKey];
    test('triggers sync when no data found' + `(${storageKey})`, () => {
      const testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        syncData = 'syncData';
      const sync1 = jest.fn(async params => {
        return syncData;
      });
      const sync2 = jest.fn(async params => {
        return syncData + params.id;
      });
      storage.sync[testKey1] = sync1;
      storage.sync[testKey2] = sync2;

      return Promise.all([
        // key not found
        storage.load({
          key: testKey1
        }),
        // key and id not found
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
        let { resolve } = params;
        resolve && resolve(syncData);
      });
      let sync2 = jest.fn(params => {
        let { id, resolve } = params;
        resolve && resolve(syncData + id);
      });
      storage.sync[testKey1] = sync1;
      storage.sync[testKey2] = sync2;

      // save data, expires in long time
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

      // instantly load
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
    test(
      'triggers sync when data expires but still returns outdated data(syncInBackground: true)' + `(${storageKey})`,
      () => {
        let testKey1 = 'testKey1' + Math.random(),
          testKey2 = 'testKey2' + Math.random(),
          testId2 = 'testId2' + Math.random(),
          testData1 = 'testData1',
          testData2 = 'testData2',
          syncData = 'syncData';
        let sync1 = jest.fn(params => {
          let { resolve } = params;
          resolve && resolve(syncData);
        });
        let sync2 = jest.fn(params => {
          let { id, resolve } = params;
          resolve && resolve(syncData + id);
        });
        storage.sync[testKey1] = sync1;
        storage.sync[testKey2] = sync2;

        // save data, expires in no time
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

        // instantly load
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
      }
    );
    test('triggers sync when data expires and returns latest data(syncInBackground: false)' + `(${storageKey})`, () => {
      let testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        testData1 = 'testData1',
        testData2 = 'testData2',
        syncData = 'syncData';
      let sync1 = jest.fn(async params => {
        return syncData;
      });
      let sync2 = jest.fn(async params => {
        return syncData + params.id;
      });
      storage.sync[testKey1] = sync1;
      storage.sync[testKey2] = sync2;

      // save data, expires in no time
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

      // instantly load
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
        return testData3;
      });
      storage.sync[testKey3] = sync3;

      // save key1 and key2
      storage.save({
        key: testKey1,
        data: testData1
      });
      storage.save({
        key: testKey2,
        data: testData2
      });

      // instantly load
      return storage.getBatchData([{ key: testKey1 }, { key: testKey2 }, { key: testKey3 }]).then(ret => {
        expect(ret[0]).toBe(testData1);
        expect(ret[1]).toBe(testData2);
        expect(ret[2]).toBe(testData3);
        expect(sync3.mock.calls.length).toBe(1);
      });
    });
    test('returns batch data with batch ids' + `(${storageKey})`, () => {
      const originDateNow = Date.now;
      let starttime = 0;
      Date.now = jest.fn(() => {
        return (starttime += 100);
      });
      const testKey = 'testKey' + Math.random(),
        testId1 = 'testId1' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        testId3 = 'testId3' + Math.random(),
        testId4 = 'testId4' + Math.random(),
        testData1 = 'testData1',
        testData2 = 'testData2',
        testData3 = 'testData3',
        testData4 = 'testData4';
      const sync = jest.fn(async params => {
        // when id is an array, the return value should be an ordered array too
        return [testData2, testData4];
      });
      storage.sync[testKey] = sync;
      // save id1 and id3
      storage.save({
        key: testKey,
        id: testId1,
        data: testData1
      });
      storage.save({
        key: testKey,
        id: testId3,
        data: testData3
      });
      // save id2 and set it expired immediately
      storage.save({
        key: testKey,
        id: testId2,
        data: testData2,
        expires: 1,
      });

      // instantly load
      return storage
        .getBatchDataWithIds({
          key: testKey,
          ids: [testId1, testId2, testId3, testId4]
        })
        .then(ret => {
          expect(ret[0]).toBe(testData1);
          expect(ret[1]).toBe(testData2);
          expect(ret[2]).toBe(testData3);
          expect(ret[3]).toBe(testData4);
          expect(JSON.stringify(sync.mock.calls[0][0].id)).toBe(JSON.stringify([testId2, testId4]));
          Date.now = originDateNow;
        });
    });
  });
});
