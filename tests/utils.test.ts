import os from 'os';
import process from 'process';
import * as utils from '@/utils';

describe('utils', () => {
  test('getting default node path', () => {
    const homeDir = os.homedir();
    const p = utils.getDefaultNodePath();
    if (process.platform === 'linux') {
      expect(p).toBe(`${homeDir}/.local/share/polykey`);
    } else if (process.platform === 'darwin') {
      expect(p).toBe(`${homeDir}/Library/Application Support/polykey`);
    } else if (process.platform === 'win32') {
      expect(p).toBe(`${homeDir}/AppData/Local/polykey`);
    }
  });
  test('string literal union type guard method 1', async () => {
    // We need a way to get a list of valid strings from a string litteral union.
    const validTestType = ['type1', 'type2'];
    type TestType = 'type1' | 'type2';
    // Now we need to define a type guard from this.
    function isTestType(arg: any): arg is TestType {
      if(typeof arg !== "string") return false;
      return validTestType.includes(arg);
    }
    function testfun(test: TestType){}

    // Now we can try it.
    const test = 'type1';
    if(isTestType(test)){
      testfun(test);
    }

    // Testing out a constructor.
    function makeTestType(value: string): TestType {
      if(isTestType(value)) return value;
      else throw Error();
    }
    const test2 = makeTestType('type2');
  });
  test('string literal union type guard method 2', async () => {
    // We need a way to get a list of valid strings from a string litteral union.
    const validTestType = ['type1', 'type2'] as const; //Now this is the sole source of truth for the type.
    type TestType = typeof validTestType[number];
    // Now we need to define a type guard from this.
    function isTestType(arg: any): arg is TestType {
      if(typeof arg !== "string") return false;
      // @ts-ignore
      return validTestType.includes(arg);
    }
    function testfun(test: TestType){}

    // Now we can try it.
    const test = 'type4';
    if(isTestType(test)){
      testfun(test);
    }

    // Testing out a constructor.
    function makeTestType(value: string): TestType {
      if(isTestType(value)) return value;
      else throw Error();
    }
    const test2 = makeTestType('type2');
  });
});
