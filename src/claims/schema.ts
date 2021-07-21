import type { Claim, ClaimValidation } from './types';

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';

import ClaimIdentitySchema from './ClaimIdentity.json';
import ClaimNodeSchema from './ClaimNode.json';

const ajv = new Ajv();

const claimIdentitySchema =
  ClaimIdentitySchema as JSONSchemaType<ClaimValidation>;
const claimIdentityValidate: ValidateFunction<Claim> =
  ajv.compile(claimIdentitySchema);

const claimNodeSchema = ClaimNodeSchema as JSONSchemaType<ClaimValidation>;
const claimNodeValidate: ValidateFunction<Claim> = ajv.compile(claimNodeSchema);

export { claimIdentityValidate, claimNodeValidate };
