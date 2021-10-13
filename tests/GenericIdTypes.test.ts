import { IdRandom } from "@matrixai/id";
import { makeRandomId, makeRawRandomId, RandomId, RawRandomId } from "@/GenericIdTypes";
import { Opaque } from "@/types";
import { ErrorInvalidId } from "@/errors";

describe('GenericID Type utility functions', () => {
  type testRawType = Opaque<'testRawType', RawRandomId>;
  type testType = Opaque<'testType', RandomId>;

  let validString = 'zUGWu8zn6VSa6dYrty8DJdm';
  let invalidString = 'notAValidString';
  let validBuffer = Buffer.alloc(16);
  let invalidBuffer = Buffer.alloc(20);

  test('can generate a testRawType', async () => {
    const idGen = new IdRandom();
    const idBuffer = Buffer.from(idGen.get());
  });
  test('can generate a testType', async () => {
    const idGen = new IdRandom();
    const idBuffer = Buffer.from(idGen.get());
  });
  test('makeRawRandomId converts a buffer',  () => {
    expect(() => makeRawRandomId<testRawType>(validBuffer)).not.toThrow();
  });
  test('makeRawRandomId converts a string',  () => {
    expect(() => makeRawRandomId<testRawType>(validString)).not.toThrow();
  });
  test('makeRawRandomId throws error for invalid buffer.',  () => {
    expect(() => makeRawRandomId<testRawType>(invalidBuffer)).toThrow(ErrorInvalidId);
  });
  test('makeRawRandomId throws error for invalid string.',  () => {
    expect(() => makeRawRandomId<testRawType>(invalidString)).toThrow(ErrorInvalidId);
  });
  test('makeRandomID converts a Buffer.',  () => {
    expect(() => makeRandomId<testType>(validBuffer)).not.toThrow();
  });
  test('makeRandomID converts a string.',  () => {
    expect(() => makeRandomId<testType>(validString)).not.toThrow();
  });
  test('makeRawRandomId throws error for invalid buffer.',  () => {
    expect(() => makeRandomId<testType>(invalidBuffer)).toThrow(ErrorInvalidId);
  });
  test('makeRawRandomId throws error for invalid buffer.',  () => {
    expect(() => makeRandomId<testType>(invalidString)).toThrow(ErrorInvalidId);
  });
});
