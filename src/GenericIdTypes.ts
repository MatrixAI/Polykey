
import { utils as idUtils } from "@matrixai/id";
import { ErrorInvalidId } from "@/errors";
import { Id as InternalId } from '@matrixai/id/dist/Id';

/// This is the internal form of the Id.
export type  Id = InternalId;
/// This is the user readable string form of the Id.
export type IdString = string;
// This is the number of bytes a valid Id has
const idValidByteLength = 16;

// Type guards for generic RandomId types.
function isId<T extends Id>(arg: any): arg is T {
  if (!( arg instanceof Uint8Array)) return false;
  return arg.length === idValidByteLength;
}

/**
 * This will return arg as a valid VaultId or throw an error if it can't be converted.
 * This will take a multibase string of the ID or the raw Buffer of the ID.
 * @param arg - The variable we wish to convert
 * @throws vaultErrors.ErrorInvalidVaultId  if the arg can't be converted into a VaultId
 * @returns VaultIdRaw
 */
function makeId<T extends Id>(arg: any): T {
  let id = arg;
  // Checking and converting a string
  if (typeof arg === 'string'){
    // Covert the string to the Buffer form.
    id = idUtils.fromMultibase(arg);
    if (id == null) throw new ErrorInvalidId();
  }

  // If its a buffer we convert it to a Id.
  if (arg instanceof Buffer) id = idUtils.fromBuffer(id);

  // checking if valid buffer.
  if (isId<T>(id)) return id;
  throw new ErrorInvalidId();
}

function isIdString<T extends IdString>(arg: any): arg is T {
  if (typeof arg !== 'string') return false;
  let id = idUtils.fromMultibase(arg);
  if (id == null) return false;
  return id.length === idValidByteLength;
}

function makeIdString<T extends IdString>(arg: any): T {
  let id = arg;
  if ((id instanceof Uint8Array)) {
    id = idUtils.toMultibase(arg, 'base58btc');
  }
  if(isIdString<T>(id)) return id;
  throw new ErrorInvalidId();
}

function idToString(id: Id): IdString {
  return id.toString();
}

function stringToId(idString: IdString): Id {
  return idUtils.fromString(idString)!
}

export {
  isId,
  makeId,
  isIdString,
  makeIdString,
  idToString,
  stringToId,
};
