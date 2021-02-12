import type { LinkClaimIdentity, LinkClaimNode } from './types';

import Ajv, { JSONSchemaType } from 'ajv';
import LinkClaimIdentitySchema from './schemas/LinkClaimIdentity.json';
import LinkClaimNodeSchema from './schemas/LinkClaimNode.json';

const ajv = new Ajv();

const linkClaimIdentitySchema = LinkClaimIdentitySchema as JSONSchemaType<LinkClaimIdentity>;
const linkClaimIdentityValidate = ajv.compile(linkClaimIdentitySchema);

const linkClaimNodeSchema = LinkClaimNodeSchema as JSONSchemaType<LinkClaimNode>;
const linkClaimNodeValidate = ajv.compile(linkClaimNodeSchema);

export { linkClaimIdentityValidate, linkClaimNodeValidate };
