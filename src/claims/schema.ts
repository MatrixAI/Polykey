import type { Claim, ClaimValidation } from './types';
import type { JSONSchemaType, ValidateFunction } from 'ajv';
import Ajv from 'ajv';
import ClaimIdentitySchema from './schemas/ClaimIdentity.json';
import ClaimNodeSinglySignedSchema from './schemas/ClaimNodeSinglySigned.json';
import ClaimNodeDoublySignedSchema from './schemas/ClaimNodeDoublySigned.json';

const ajv = new Ajv();

const claimIdentitySchema =
  ClaimIdentitySchema as JSONSchemaType<ClaimValidation>;
const claimIdentityValidate: ValidateFunction<Claim> =
  ajv.compile(claimIdentitySchema);

const claimNodeSinglySignedSchema =
  ClaimNodeSinglySignedSchema as JSONSchemaType<ClaimValidation>;
const claimNodeSinglySignedValidate: ValidateFunction<Claim> = ajv.compile(
  claimNodeSinglySignedSchema,
);

const claimNodeDoublySignedSchema =
  ClaimNodeDoublySignedSchema as JSONSchemaType<ClaimValidation>;
const claimNodeDoublySignedValidate: ValidateFunction<Claim> = ajv.compile(
  claimNodeDoublySignedSchema,
);

export {
  claimIdentityValidate,
  claimNodeSinglySignedValidate,
  claimNodeDoublySignedValidate,
};
