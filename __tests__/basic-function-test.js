jest.dontMock('../storage.js');

let Storage = require('../storage.js');
const SIZE = 10,
  DEFAULTEXPIRES = 1000 * 3600;
let storage = new Storage({
  size: SIZE,
  defaultExpires: DEFAULTEXPIRES
});

describe('react-native-storage: basic function', () => {
  it('accepts parameters in constructor', () => {
    expect(storage._SIZE).toBe(SIZE);
    expect(storage.defaultExpires).toBe(DEFAULTEXPIRES);
  });
  pit('saves and loads any type of data', () => {
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
            }).then( ret => {
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
            }).then( ret => {
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
  pit('rejects when no data found and no sync method', () => {
    let testKey1 = 'testKey' + Math.random(),
      testKey2 = 'testKey' + Math.random(),
      testId2 = 'testId' + Math.random();
    let ret1, ret2, reject1, reject2;
    let tasks = [
      storage.load({
        key: testKey1
      }).then( ret => {
        ret1 = ret;
      }).catch( () => {
        reject1 = true;
      }),
      storage.load({
        key: testKey2,
        id: testId2
      }).then( ret => {
        ret2 = ret;
      }).catch( () => {
        reject2 = true;
      })
    ];
    return Promise.all(tasks).then(() => {
      expect(ret1).toBeUndefined();
      expect(ret2).toBeUndefined();
      expect(reject1 && reject2).toBe(true);
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
  //it('ignores all "key+id" data when innerVersion mismatched', () => {
  //  let testKey = 'testKey' + Math.random(),
  //    testId = 'testId' + Math.random(),
  //    testData = 'testData' + Math.random();
  //  let ret1, ret2, done1, done2, tmpVersion;
  //  runs(() => {
  //    storage.save({
  //      key: testKey,
  //      id: testId,
  //      rawData: testData
  //    });
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
  //    let map = JSON.parse(storage._s.getItem('map'));
  //    tmpVersion = map.innerVersion;
  //    map.innerVersion = -1;
  //    storage._s.setItem('map', JSON.stringify(map));
  //
  //    let newStorage = new Storage();
  //    newStorage.load({
  //      key: testKey,
  //      id: testId
  //    }).then(ret => {
  //      ret2 = ret;
  //      done2 = true;
  //    }).catch(() => {
  //      done2 = true;
  //    });
  //  });
  //  waitsFor(() => {
  //    return done1 && done2;
  //  }, 'Values should be loaded', 1000);
  //  runs(() => {
  //    expect(ret1).toBe(testData);
  //    expect(ret2).toBeUndefined();
  //
  //    let newMap = JSON.parse(storage._s.getItem('map'));
  //    newMap.innerVersion = tmpVersion;
  //    storage._s.setItem('map', JSON.stringify(newMap));
  //  });
  //});

  pit('removes data correctly', () => {
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
      }).then( ret => {
        retArray[0] = ret;
        return storage.remove({ key, id });
      }).then( () => {
        return storage.load({ key, id });
      }).then( ret => {
        retArray[1] = ret;
      }).catch( () => {
        retArray[1] = 'catched';
      });;
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
});