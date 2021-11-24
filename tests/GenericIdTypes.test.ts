import type { Id } from '@matrixai/id/dist/Id';
import type { IdString } from '@/GenericIdTypes';
import type { Opaque } from '@/types';
import { utils as idUtils } from '@matrixai/id';
import { makeIdString, makeId } from '@/GenericIdTypes';
import { ErrorInvalidId } from '@/errors';

describe('GenericID Type utility functions', () => {
  type TestRawType = Opaque<'testRawType', Id>;
  type TestType = Opaque<'testType', IdString>;

  const validString = 'zUGWu8zn6VSa6dYrty8DJdm';
  const invalidString = 'notAValidString';
  const validBuffer = Buffer.alloc(16);
  const invalidBuffer = Buffer.alloc(20);
  const validTestRawType = idUtils.fromString(
    'Vaultxxxxxxxxxxx',
  ) as TestRawType;

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

  test('makeId converts a buffer', () => {
    expect(() => makeId<TestRawType>(validTestRawType)).not.toThrow();
  });
  test('makeId converts a buffer', () => {
    expect(() => makeId<TestRawType>(validBuffer)).not.toThrow();
  });
  test('makeId converts a string', () => {
    expect(() => makeId<TestRawType>(validString)).not.toThrow();
  });
  test('makeId throws error for invalid buffer.', () => {
    expect(() => makeId<TestRawType>(invalidBuffer)).toThrow(ErrorInvalidId);
  });
  test('makeId throws error for invalid string.', () => {
    expect(() => makeId<TestRawType>(invalidString)).toThrow(ErrorInvalidId);
  });
  test('makeIdString converts a Buffer.', () => {
    expect(() => makeIdString<TestType>(validBuffer)).not.toThrow();
  });
  test('makeIdString converts a string.', () => {
    expect(() => makeIdString<TestType>(validString)).not.toThrow();
  });
  test('makeIdString throws error for invalid buffer.', () => {
    expect(() => makeIdString<TestType>(invalidBuffer)).toThrow(ErrorInvalidId);
  });
  test('makeIdString throws error for invalid buffer.', () => {
    expect(() => makeIdString<TestType>(invalidString)).toThrow(ErrorInvalidId);
  });
});
