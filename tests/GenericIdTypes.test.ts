import { IdRandom } from "@matrixai/id";
import { makeIdString, makeId, IdString } from "@/GenericIdTypes";
import { Opaque } from "@/types";
import { ErrorInvalidId } from "@/errors";
import { Id } from '@matrixai/id/dist/Id';
import { utils as idUtils } from '@matrixai/id';

describe('GenericID Type utility functions', () => {
  type testRawType = Opaque<'testRawType', Id>;
  type testType = Opaque<'testType', IdString>;

  let validString = 'zUGWu8zn6VSa6dYrty8DJdm';
  let invalidString = 'notAValidString';
  let validBuffer = Buffer.alloc(16);
  let invalidBuffer = Buffer.alloc(20);
  let validTestRawType = idUtils.fromString('Vaultxxxxxxxxxxx') as testRawType;

  // Testing generation.
  // test('can generate a Id', async () => {
  //   const idGen = new IdRandom();
  //   const id = idGen.get();
  //   console.log(id.toString());
  //   console.log(Buffer.from(id).toString());
  // });
  // // Testing conversions.
  // test('random tests',  () => {
  //   const idGen = new IdRandom();
  //   const id = idGen.get();
  //   const idString = id.toString();
  //   console.log(idString);
  //
  //   const testString = 'vault1xxxxxxxxxx';
  //   console.log(idUtils.fromString(testString))
  //   console.log(idUtils.toString(idUtils.fromString(testString)!))
  // });


  test('makeId converts a buffer',  () => {
    expect(() => makeId<testRawType>(validTestRawType)).not.toThrow();
  });
  test('makeId converts a buffer',  () => {
    expect(() => makeId<testRawType>(validBuffer)).not.toThrow();
  });
  test('makeId converts a string',  () => {
    expect(() => makeId<testRawType>(validString)).not.toThrow();
  });
  test('makeId throws error for invalid buffer.',  () => {
    expect(() => makeId<testRawType>(invalidBuffer)).toThrow(ErrorInvalidId);
  });
  test('makeId throws error for invalid string.',  () => {
    expect(() => makeId<testRawType>(invalidString)).toThrow(ErrorInvalidId);
  });
  test('makeIdString converts a Buffer.',  () => {
    expect(() => makeIdString<testType>(validBuffer)).not.toThrow();
  });
  test('makeIdString converts a string.',  () => {
    expect(() => makeIdString<testType>(validString)).not.toThrow();
  });
  test('makeIdString throws error for invalid buffer.',  () => {
    expect(() => makeIdString<testType>(invalidBuffer)).toThrow(ErrorInvalidId);
  });
  test('makeIdString throws error for invalid buffer.',  () => {
    expect(() => makeIdString<testType>(invalidString)).toThrow(ErrorInvalidId);
  });
});
