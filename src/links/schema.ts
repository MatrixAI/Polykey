import type { LinkClaimIdentity, LinkClaimNode } from './types';

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import LinkClaimIdentitySchema from './schemas/LinkClaimIdentity.json';
import LinkClaimNodeSchema from './schemas/LinkClaimNode.json';

const ajv = new Ajv();

const linkClaimIdentitySchema = LinkClaimIdentitySchema as JSONSchemaType<LinkClaimIdentity>;
const linkClaimIdentityValidate: ValidateFunction<LinkClaimIdentity> = ajv.compile(
  linkClaimIdentitySchema,
);

const linkClaimNodeSchema = LinkClaimNodeSchema as JSONSchemaType<LinkClaimNode>;
const linkClaimNodeValidate: ValidateFunction<LinkClaimNode> = ajv.compile(
  linkClaimNodeSchema,
);

export { linkClaimIdentityValidate, linkClaimNodeValidate };
