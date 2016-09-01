jest.dontMock('../error.js');
jest.dontMock('../storage.js');

let Storage = require('../storage.js');
const SIZE = 10,
  DEFAULTEXPIRES = 1000 * 3600;
let localStorage = new Storage({
  size: SIZE,
  defaultExpires: DEFAULTEXPIRES,
  storageBackend: window.localStorage
});
let asyncStorage = new Storage({
  size: SIZE,
  defaultExpires: DEFAULTEXPIRES,
  storageBackend: window.asyncStorage
});
let stores = { localStorage, asyncStorage };

describe('react-native-storage: basic function', () => {
  Object.keys(stores).map(storageKey => {
    let storage = stores[storageKey];
    it('accepts parameters in constructor' + `(${storageKey})`, () => {
      expect(storage._SIZE).toBe(SIZE);
      expect(storage.defaultExpires).toBe(DEFAULTEXPIRES);
    });
    pit('saves and loads any type of data' + `(${storageKey})`, () => {
      let testCases = {
        testNumber: 11221,
        testString: 'testString',
        testObject: {
          fname: 'foo',
          lname: 'bar'
        },
        testArray: [ 'one', 'two', 'three' ],
        testBoolean: false,
        testNull: null,
        complexObject: {
          complexArray : [ 1, 2, 3, 'test', { a: 'b' } ]
        }
      };
      let returnCases = {}, returnCasesWithId = {};
      let tasks = [];
      for(let key in testCases) {
        tasks.push(
          storage.save({
            key,
            rawData: testCases[key]
          }).then(() =>
            storage.load({
              key
            }).then(ret => {
              returnCases[key] = ret;
            })
          )
        );
        tasks.push(
          storage.save({
            key,
            id: 1,
            rawData: testCases[key]
          }).then(() =>
            storage.load({
              key,
              id: 1
            }).then(ret => {
              returnCasesWithId[key] = ret;
            })
          )
        );
      }
      return Promise.all(tasks).then(() => {
        for(let key in testCases) {
          expect(JSON.stringify(testCases[key])).toBe(JSON.stringify(returnCases[key]));
          expect(JSON.stringify(testCases[key])).toBe(JSON.stringify(returnCasesWithId[key]));
        }
      });
    });
    pit('rejects when no data found and no sync method' + `(${storageKey})`, () => {
      let testKey1 = 'testKey' + Math.random(),
        testKey2 = 'testKey' + Math.random(),
        testId2 = 'testId' + Math.random();
      let ret1, ret2, error1, error2;
      let tasks = [
        storage.load({
          key: testKey1
        }).then(ret => {
          ret1 = ret;
        }).catch(e => {
          error1 = e;
        }),
        storage.load({
          key: testKey2,
          id: testId2
        }).then(ret => {
          ret2 = ret;
        }).catch(e => {
          error2 = e;
        })
      ];
      return Promise.all(tasks).then(() => {
        expect(ret1).toBeUndefined();
        expect(ret2).toBeUndefined();
        expect(error1.name).toBe('NotFoundError');
        expect(error2.name).toBe('NotFoundError');
      });
    });

    pit('rejects when data expired and no sync method' + `(${storageKey})`, () => {
      let originGetTime = Date.prototype.getTime;
      let starttime = 0;
      Date.prototype.getTime = jest.genMockFn().mockImpl(() => {
        return starttime += 100;
      });
      let testKey1 = 'testKey' + Math.random(),
        testKey2 = 'testKey' + Math.random(),
        testId2 = 'testId' + Math.random(),
        testData1 = 'testData1' + Math.random(),
        testData2 = 'testData2' + Math.random();
      let ret1, ret2, error1, error2;
      let tasks = [
        storage.save({
          key: testKey1,
          rawData: testData1,
          expires: 1,
        }).then(() => 
          storage.load({
            key: testKey1
          })
        ).then(ret => {
          ret1 = ret;
        }).catch(e => {
          error1 = e;
        }),
        storage.save({
          key: testKey2,
          id: testId2,
          rawData: testData2,
          expires: 1,
        }).then(() =>
          storage.load({
            key: testKey2,
            id: testId2,
          })
        ).then(ret => {
          ret2 = ret;
        }).catch(e => {
          error2 = e;
        }),
      ];
      return Promise.all(tasks).then(() => {
        expect(ret1).toBeUndefined();
        expect(ret2).toBeUndefined();
        expect(error1.name).toBe('ExpiredError');
        expect(error2.name).toBe('ExpiredError');
        Date.prototype.getTime = originGetTime;
      });
    });
    //it('overwrites "key+id" data when loops over(exceeds SIZE)', () => {
    //  let testKey = 'testKey' + Math.random(),
    //    testId = 'testId' + Math.random(),
    //    testData = 'testData' + Math.random();
    //  let ret1, ret2, done1, done2, tmpIndex1, tmpIndex2;
    //  runs(() => {
    //    storage.save({
    //      key: testKey,
    //      id: testId,
    //      rawData: testData
    //    });
    //    tmpIndex1 = storage._m.index;
    //    for (let i = 0; i < SIZE - 1; i++) {
    //      storage.save({
    //        key: 'testKey' + Math.random(),
    //        id: 'testId' + Math.random(),
    //        rawData: 'testData' + Math.random()
    //      });
    //    }
    //
    //    //not overwrited yet
    //    storage.load({
    //      key: testKey,
    //      id: testId
    //    }).then( ret => {
    //      ret1 = ret;
    //      done1 = true;
    //    }).catch(() => {
    //      done1 = true;
    //    });
    //
    //    //overwrite
    //    storage.save({
    //      key: 'testKey' + Math.random(),
    //      id: 'testId' + Math.random(),
    //      rawData: 'testData' + Math.random()
    //    });
    //    tmpIndex2 = storage._m.index;
    //    storage.load({
    //      key: testKey,
    //      id: testId
    //    }).then( ret => {
    //      ret2 = ret;
    //      done2 = true;
    //    }).catch(() => {
    //      done2 = true;
    //    });
    //  });
    //  waitsFor(() => {
    //    return done1 && done2;
    //  }, 'Values should be loaded', 1000);
    //
    //  runs(() => {
    //    expect(tmpIndex1).toBe(tmpIndex2);
    //    expect(ret1).toBe(testData);
    //    expect(ret2).toNotBe(testData);
    //  });
    //});


    pit('removes data correctly' + `(${storageKey})`, () => {
      let testKey1 = 'testKey1' + Math.random(),
        testKey2 = 'testKey2' + Math.random(),
        testId2 = 'testId2' + Math.random(),
        testData1 = 'testData1' + Math.random(),
        testData2 = 'testData2' + Math.random();
      let ret1 = [undefined, undefined], ret2 = [undefined, undefined];
      let task = (key, id, rawData, retArray) => {
        return storage.save({
          key,
          id,
          rawData
        }).then(() => {
          return storage.load({
            key,
            id
          });
        }).then(ret => {
          retArray[0] = ret;
          return storage.remove({ key, id });
        }).then(() => {
          return storage.load({ key, id });
        }).then(ret => {
          retArray[1] = ret;
        }).catch(() => {
          retArray[1] = 'catched';
        });
      };
      return Promise.all([
        task(testKey1, undefined, testData1, ret1),
        task(testKey2, testId2, testData2, ret2)
      ]).then(() => {
        expect(ret1[0]).toBe(testData1);
        expect(ret1[1]).toBe('catched');
        expect(ret2[0]).toBe(testData2);
        expect(ret2[1]).toBe('catched');
      });
    });

    pit('get all data for key correctly' + `(${storageKey})`, () =>{
      let key = 'testKey' + Math.random(),
        testIds = [Math.random(), Math.random(), Math.random()],
        testDatas = [Math.random(), Math.random(), Math.random()];
      return Promise.all(
        testIds.map((id, i) => storage.save({
          key,
          id,
          rawData: testDatas[i]
        }))
      )
      .then(() => {
        return storage.getAllDataForKey(key);
      })
      .then(realRet => {
        expect(realRet).toEqual(testDatas);
      });
    });


    pit('load ids by key correctly' + `(${storageKey})`, () => {
      let key = 'testKey' + Math.random(),
        testIds = [Math.random(), Math.random(), Math.random()],
        rawData = 'testData' + Math.random();
      let ret = [];
      let tasks = testIds.map(id =>
        storage.save({
          key,
          id,
          rawData
        })
      );
      return Promise.all(tasks).then(() => {
        storage.getIdsForKey(key).then(rets => {
          expect(rets).toEqual(testIds);
        });
      })
    });
  });
});