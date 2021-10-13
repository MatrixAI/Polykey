// Type guards for generic RandomId types.

import { utils as idUtils } from "@matrixai/id";
import { ErrorInvalidId } from "@/errors";

type RawRandomId = Buffer;
type RandomId = string;
const RawRandomIdLength = 16;

function isRawRandomId<T extends RawRandomId>(arg: any): arg is T {
  if (!( arg instanceof Buffer)) return false;
  return arg.length === RawRandomIdLength;
}

/**
 * This will return arg as a valid VaultId or throw an error if it can't be converted.
 * This will take a multibase string of the ID or the raw Buffer of the ID.
 * @param arg - The variable we wish to convert
 * @throws vaultErrors.ErrorInvalidVaultId  if the arg can't be converted into a VaultId
 * @returns VaultIdRaw
 */
function makeRawRandomId<T extends Buffer>(arg: any): T {
  let id = arg;
  // Checking and converting a string
  if (typeof arg === 'string'){
    // Covert the string to the Buffer form.
    id = idUtils.fromMultibase(arg);
    if (id == null) throw new ErrorInvalidId();
    id = Buffer.from(id);
  }

  // checking if valid buffer.
  if (isRawRandomId<T>(id)) return id;
  throw new ErrorInvalidId();
}

function isRandomId<T extends RandomId>(arg: any): arg is T {
  if (typeof arg !== 'string') return false;
  let id = idUtils.fromMultibase(arg);
  if (id == null) return false;
  return Buffer.from(id).length === RawRandomIdLength;
}

function makeRandomId<T extends RandomId>(arg: any): T {
  let id = arg;
  if ((id instanceof Buffer)) {
    id = idUtils.toMultibase(arg, 'base58btc');
  }
  if(isRandomId<T>(id)) return id;
  throw new ErrorInvalidId();
}

export {
  RawRandomId,
  RandomId,
  isRawRandomId,
  makeRawRandomId,
  isRandomId,
  makeRandomId,
};
