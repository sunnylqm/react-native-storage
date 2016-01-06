/**
 * Created by sunny on 15/10/5.
 */
jest.dontMock('../storage.js');

let Storage = require('../storage.js');
let storage = new Storage();

describe('react-native-storage: batch and sync test', () => {
  it('triggers sync when no data found', () => {
    let testKey1 = 'testKey1' + Math.random(),
      testKey2 = 'testKey2' + Math.random(),
      testId2 = 'testId2' + Math.random(),
      syncData = 'syncData';
    let ret1, ret2,
      done1, done2;
    let sync1 = jest.genMockFn().mockImpl( params => {
      let { resolve } = params;
      resolve && resolve(syncData);
    });
    let sync2 = jest.genMockFn().mockImpl( params => {
      let { id, resolve } = params;
      resolve && resolve(syncData + id);
    });
    storage.sync[testKey1] = sync1;
    storage.sync[testKey2] = sync2;

    runs(() => {
      //key not found
      storage.load({
        key: testKey1
      }).then( ret => {
        ret1 = ret;
        done1 = true;
      }).catch( () => {
        done1 = true;
      });
      //key and id not found
      storage.load({
        key: testKey2,
        id: testId2
      }).then( ret => {
        ret2 = ret;
        done2 = true;
      }).catch( () => {
        done2 = true;
      });
    });
    waitsFor(() => {
      return done1 && done2;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret1).toBe(syncData);
      expect(sync1.mock.calls.length).toBe(1);
      expect(sync2.mock.calls.length).toBe(1);
      expect(ret2).toBe(syncData + testId2);
    });
  });
  it('does not trigger sync when data found and do not expire', () => {
    let testKey1 = 'testKey1' + Math.random(),
      testKey2 = 'testKey2' + Math.random(),
      testId2 = 'testId2' + Math.random(),
      testData1 = 'testData1',
      testData2 = 'testData2',
      syncData = 'syncData';
    let ret1, ret2,
      done1, done2;
    let sync1 = jest.genMockFn().mockImpl( params => {
      let { resolve } = params;
      resolve && resolve(syncData);
    });
    let sync2 = jest.genMockFn().mockImpl( params => {
      let { id, resolve } = params;
      resolve && resolve(syncData + id);
    });
    storage.sync[testKey1] = sync1;
    storage.sync[testKey2] = sync2;

    runs(() => {
      //save data, expires in long time
      storage.save({
        key: testKey1,
        rawData: testData1,
        expires: 10000
      });
      storage.save({
        key: testKey2,
        id: testId2,
        rawData: testData2,
        expires: 10000
      });

      //instantly load
      storage.load({
        key: testKey1
      }).then( ret => {
        ret1 = ret;
        done1 = true;
      }).catch( () => {
        done1 = true;
      });
      storage.load({
        key: testKey2,
        id: testId2
      }).then( ret => {
        ret2 = ret;
        done2 = true;
      }).catch( () => {
        done2 = true;
      });
    });
    waitsFor(() => {
      return done1 && done2;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret1).toBe(testData1);
      expect(sync1.mock.calls.length).toBe(0);
      expect(sync2.mock.calls.length).toBe(0);
      expect(ret2).toBe(testData2);
    });
  });
  it('triggers sync when data expires but still returns outdated data(syncInBackground: true)', () => {
    let testKey1 = 'testKey1' + Math.random(),
      testKey2 = 'testKey2' + Math.random(),
      testId2 = 'testId2' + Math.random(),
      testData1 = 'testData1',
      testData2 = 'testData2',
      syncData = 'syncData';
    let ret1, ret2,
      done1, done2;
    let sync1 = jest.genMockFn().mockImpl( params => {
      let { resolve } = params;
      resolve && resolve(syncData);
    });
    let sync2 = jest.genMockFn().mockImpl( params => {
      let { id, resolve } = params;
      resolve && resolve(syncData + id);
    });
    storage.sync[testKey1] = sync1;
    storage.sync[testKey2] = sync2;

    runs(() => {
      //save data, expires in no time
      storage.save({
        key: testKey1,
        rawData: testData1,
        expires: -1
      });
      storage.save({
        key: testKey2,
        id: testId2,
        rawData: testData2,
        expires: -1
      });

      //instantly load
      storage.load({
        key: testKey1
      }).then( ret => {
        ret1 = ret;
        done1 = true;
      }).catch( () => {
        done1 = true;
      });
      storage.load({
        key: testKey2,
        id: testId2
      }).then( ret => {
        ret2 = ret;
        done2 = true;
      }).catch( () => {
        done2 = true;
      });
    });

    waitsFor(() => {
      return done1 && done2;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret1).toBe(testData1);
      expect(sync1.mock.calls.length).toBe(1);

      expect(ret2).toBe(testData2);
      expect(sync2.mock.calls.length).toBe(1);
    });
  });
  it('triggers sync when data expires and returns latest data(syncInBackground: false)', () => {
    let testKey1 = 'testKey1' + Math.random(),
      testKey2 = 'testKey2' + Math.random(),
      testId2 = 'testId2' + Math.random(),
      testData1 = 'testData1',
      testData2 = 'testData2',
      syncData = 'syncData';
    let ret1, ret2,
      done1, done2;
    let sync1 = jest.genMockFn().mockImpl( params => {
      let { resolve } = params;
      resolve && resolve(syncData);
    });
    let sync2 = jest.genMockFn().mockImpl( params => {
      let { id, resolve } = params;
      resolve && resolve(syncData + id);
    });
    storage.sync[testKey1] = sync1;
    storage.sync[testKey2] = sync2;

    runs(() => {
      //save data, expires in no time
      storage.save({
        key: testKey1,
        rawData: testData1,
        expires: -1
      });
      storage.save({
        key: testKey2,
        id: testId2,
        rawData: testData2,
        expires: -1
      });

      //instantly load
      storage.load({
        key: testKey1,
        syncInBackground: false
      }).then( ret => {
        ret1 = ret;
        done1 = true;
      }).catch( () => {
        done1 = true;
      });
      storage.load({
        key: testKey2,
        id: testId2,
        syncInBackground: false
      }).then( ret => {
        ret2 = ret;
        done2 = true;
      }).catch( () => {
        done2 = true;
      });
    });

    waitsFor(() => {
      return done1 && done2;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret1).toBe(syncData);
      expect(sync1.mock.calls.length).toBe(1);

      expect(ret2).toBe(syncData + testId2);
      expect(sync2.mock.calls.length).toBe(1);
    });
  });
  it('returns batch data with batch keys', () => {
    let testKey1 = 'testKey1' + Math.random(),
      testKey2 = 'testKey2' + Math.random(),
      testKey3 = 'testKey3' + Math.random(),
      testData1 = 'testData1',
      testData2 = 'testData2',
      testData3 = 'testData3';
    let ret,
      done;
    let sync3 = jest.genMockFn().mockImpl( params => {
      let { resolve } = params;
      resolve && resolve(testData3);
    });
    storage.sync[testKey3] = sync3;

    runs(() => {
      //save key1 and key2
      storage.save({
        key: testKey1,
        rawData: testData1
      });
      storage.save({
        key: testKey2,
        rawData: testData2
      });

      //instantly load
      storage.getBatchData([
        { key: testKey1 },
        { key: testKey2 },
        { key: testKey3 }
      ]).then( results => {
        ret = results;
        done = true;
      }).catch( () => {
        done = true;
      })
    });
    waitsFor(() => {
      return done;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret[0]).toBe(testData1);
      expect(ret[1]).toBe(testData2);
      expect(ret[2]).toBe(testData3);
      expect(sync3.mock.calls.length).toBe(1);
    });
  });
  it('returns batch data with batch ids', () => {
    let testKey = 'testKey' + Math.random(),
      testId1 = 'testId1' + Math.random(),
      testId2 = 'testId2' + Math.random(),
      testId3 = 'testId3' + Math.random(),
      testData1 = 'testData1',
      testData2 = 'testData2',
      testData3 = 'testData3';
    let ret,
      done;
    let sync = jest.genMockFn().mockImpl( params => {
      let { resolve } = params;
      // when id is an array, the return value should be an ordered array too
      resolve && resolve([testData3]);
    });
    storage.sync[testKey] = sync;

    runs(() => {
      //save id1 and id2
      storage.save({
        key: testKey,
        id: testId1,
        rawData: testData1
      });
      storage.save({
        key: testKey,
        id: testId2,
        rawData: testData2
      });

      //instantly load
      storage.getBatchDataWithIds({
        key: testKey,
        ids: [ testId1, testId2, testId3 ]
      }).then( results => {
        ret = results;
        done = true;
      }).catch( () => {
        done = true;
      })
    });
    waitsFor(() => {
      return done;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret[0]).toBe(testData1);
      expect(ret[1]).toBe(testData2);
      expect(ret[2]).toBe(testData3);
      expect(JSON.stringify(sync.mock.calls[0][0].id)).toBe(JSON.stringify([testId3]));
    });
  });
});