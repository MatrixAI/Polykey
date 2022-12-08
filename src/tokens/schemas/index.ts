import type { ValidateFunction } from 'ajv';
import type { SignedTokenEncoded } from '../types';
import Ajv from 'ajv';
import SignedTokenEncodedSchema from './SignedTokenEncodedSchema.json';

const ajv = new Ajv();

const validateSignedTokenEncoded: ValidateFunction<SignedTokenEncoded> =
  ajv.compile(SignedTokenEncodedSchema);

export { SignedTokenEncodedSchema, validateSignedTokenEncoded };
