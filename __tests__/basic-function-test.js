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
  it('saves and loads any type of data with keys', () => {
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
    let returnCases = {};
    let asyncCount = 0;
    for(let key in testCases) {
      storage.save({
        key,
        rawData: testCases[key]
      });
    }
    runs(() => {
      for(let key in testCases) {
        storage.load({
          key
        }).then( ret => {
          returnCases[key] = ret;
          asyncCount++;
        });
      }
    });
    waitsFor(() => {
      return asyncCount === 7;
    }, 'Values should be loaded', 1000);
    runs(() => {
      for(let key in testCases) {
        expect(JSON.stringify(testCases[key])).toBe(JSON.stringify(returnCases[key]));
      }
    });
  });
  it('saves and loads any type of data with keys and ids', () => {
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
    let returnCases = {};
    let asyncCount = 0;
    for(let key in testCases) {
      storage.save({
        key,
        id: 1,
        rawData: testCases[key]
      });
    }
    runs(() => {
      for(let key in testCases) {
        storage.load({
          key,
          id: 1
        }).then( ret => {
          returnCases[key] = ret;
          asyncCount++;
        });
      }
    });
    waitsFor(() => {
      return asyncCount === 7;
    }, 'Values should be loaded', 1000);
    runs(() => {
      for(let key in testCases) {
        expect(JSON.stringify(testCases[key])).toBe(JSON.stringify(returnCases[key]));
      }
    });
  });
  it('rejects when no data found and no sync method', () => {
    let testKey1 = 'testKey' + Math.random(),
      testKey2 = 'testKey' + Math.random(),
      testId2 = 'testId' + Math.random();
    let ret1, ret2, reject1, reject2, done1, done2;
    runs(() => {
      storage.load({
        key: testKey1
      }).then( ret => {
        ret1 = ret;
        done1 = true;
      }).catch( () => {
        reject1 = true;
        done1 = true;
      });
      storage.load({
        key: testKey2,
        id: testId2
      }).then( ret => {
        ret2 = ret;
        done2 = true;
      }).catch( () => {
        reject2 = true;
        done2 = true;
      });
    });
    waitsFor(() => {
      return done1 && done2;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret1).toBe(undefined);
      expect(ret2).toBe(undefined);
      expect(reject1 && reject2).toBe(true);
    });
  });
  it('overwrites "key+id" data when loops over(exceeds SIZE)', () => {
    let testKey = 'testKey' + Math.random(),
      testId = 'testId' + Math.random(),
      testData = 'testData' + Math.random();
    let ret1, ret2, done1, done2, tmpIndex1, tmpIndex2;
    runs(() => {
      storage.save({
        key: testKey,
        id: testId,
        rawData: testData
      });
      tmpIndex1 = storage._m.index;
      for (let i = 0; i < SIZE - 1; i++) {
        storage.save({
          key: 'testKey' + Math.random(),
          id: 'testId' + Math.random(),
          rawData: 'testData' + Math.random()
        });
      }

      //not overwrited yet
      storage.load({
        key: testKey,
        id: testId
      }).then( ret => {
        ret1 = ret;
        done1 = true;
      }).catch(() => {
        done1 = true;
      });

      //overwrite
      storage.save({
        key: 'testKey' + Math.random(),
        id: 'testId' + Math.random(),
        rawData: 'testData' + Math.random()
      });
      tmpIndex2 = storage._m.index;
      storage.load({
        key: testKey,
        id: testId
      }).then( ret => {
        ret2 = ret;
        done2 = true;
      }).catch(() => {
        done2 = true;
      });
    });
    waitsFor(() => {
      return done1 && done2;
    }, 'Values should be loaded', 1000);

    runs(() => {
      expect(tmpIndex1).toBe(tmpIndex2);
      expect(ret1).toBe(testData);
      expect(ret2).toNotBe(testData);
    });
  });
  it('ignores all "key+id" data when innerVersion mismatched', () => {
    let testKey = 'testKey' + Math.random(),
      testId = 'testId' + Math.random(),
      testData = 'testData' + Math.random();
    let ret1, ret2, done1, done2, tmpVersion;
    runs(() => {
      storage.save({
        key: testKey,
        id: testId,
        rawData: testData
      });
      storage.load({
        key: testKey,
        id: testId
      }).then( ret => {
        ret1 = ret;
        done1 = true;
      }).catch(() => {
        done1 = true;
      });

      let map = JSON.parse(storage._s.getItem('map'));
      tmpVersion = map.innerVersion;
      map.innerVersion = -1;
      storage._s.setItem('map', JSON.stringify(map));

      let newStorage = new Storage();
      newStorage.load({
        key: testKey,
        id: testId
      }).then(ret => {
        ret2 = ret;
        done2 = true;
      }).catch(() => {
        done2 = true;
      });
    });
    waitsFor(() => {
      return done1 && done2;
    }, 'Values should be loaded', 1000);
    runs(() => {
      expect(ret1).toBe(testData);
      expect(ret2).toBeUndefined();

      let newMap = JSON.parse(storage._s.getItem('map'));
      newMap.innerVersion = tmpVersion;
      storage._s.setItem('map', JSON.stringify(newMap));
    });
  });
});