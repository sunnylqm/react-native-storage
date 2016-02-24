jest.dontMock('../storage.js');

let Storage = require('../storage.js');
const SIZE = 10,
  DEFAULTEXPIRES = 1000 * 3600;
let storage = new Storage({
  size: SIZE,
  defaultExpires: DEFAULTEXPIRES,
  storageBackend: window.asyncStorage,
  isPromise: true
});

describe('react-native-storage: basic function(promise)', () => {
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