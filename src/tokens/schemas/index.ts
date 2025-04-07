import type { ValidateFunction } from 'ajv';
import type { SignedTokenEncoded } from '../types.js';
import Ajv from 'ajv';
import SignedTokenEncodedSchema from './SignedTokenEncodedSchema.json' assert { type: 'json' };

// @ts-ignore: Ajv exports is function improperly for ESM
const ajv = new Ajv.default();

const validateSignedTokenEncoded: ValidateFunction<SignedTokenEncoded> =
  ajv.compile(SignedTokenEncodedSchema);

export { SignedTokenEncodedSchema, validateSignedTokenEncoded };
