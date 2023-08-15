import type { Id } from '@matrixai/id';
import type { Opaque } from '../types';

// ACL

type PermissionId = Opaque<'PermissionId', Id>;
type PermissionIdString = Opaque<'PermissionIdString', string>;

// Keys

type CertId = Opaque<'CertId', Id>;
type CertIdString = Opaque<'CertIdString', string>;
/**
 * This must be a raw lowercase base16 string and not a multibase string.
 * The x509 certificate will strip any non-hex characters and add padding
 * to the nearest byte.
 */
type CertIdEncoded = Opaque<'CertIdEncoded', string>;

// Nodes

type NodeId = Opaque<'NodeId', Id>;
type NodeIdString = Opaque<'NodeIdString', string>;
type NodeIdEncoded = Opaque<'NodeIdEncoded', string>;

// Vaults

type VaultId = Opaque<'VaultId', Id>;
type VaultIdString = Opaque<'VaultIdString', string>;
type VaultIdEncoded = Opaque<'VaultIdEncoded', string>;

// Tasks

type TaskId = Opaque<'TaskId', Id>;
type TaskIdString = Opaque<'TaskIdEncoded', string>;
type TaskIdEncoded = Opaque<'TaskIdEncoded', string>;
type TaskHandlerId = Opaque<'TaskHandlerId', string>;

// Claims

type ClaimId = Opaque<'ClaimId', Id>;
type ClaimIdString = Opaque<'ClaimIdString', string>;
type ClaimIdEncoded = Opaque<'ClaimIdEncoded', string>;

// Identities

/**
 * Provider Id identifies an identity provider.
 * e.g. `github.com`
 */
type ProviderId = Opaque<'ProviderId', string>;

/**
 * Identity Id must uniquely identify the identity on the identity provider.
 * It must be the key that is used to look up the identity.
 * If the provider uses a non-string type, make the necessary conversions.
 * e.g. `cmcdragonkai`
 */
type IdentityId = Opaque<'IdentityId', string>;

/**
 * Tuple of `[ProviderId, IdentityId]`
 */
type ProviderIdentityId = [ProviderId, IdentityId];

/**
 * This is a JSON encoding of `[ProviderId, IdentityId]`
 */
type ProviderIdentityIdEncoded = Opaque<'ProviderIdentityIdEncoded', string>;

/**
 * A unique identifier for the published claim, found on the identity provider.
 * e.g. the gist ID on GitHub
 */
type ProviderIdentityClaimId = Opaque<'ProviderIdentityClaimId', string>;

// Gestalts

/**
 * Prefixed NodeId and ProviderIdentityId.
 * This is done to ensure there is no chance of conflict between
 * `NodeId` and `ProviderIdentityId`.
 */
type GestaltId = ['node', NodeId] | ['identity', ProviderIdentityId];

/**
 * GestaltId encoded.
 */
type GestaltIdEncoded = Opaque<'GestaltIdEncoded', string>;

type GestaltLinkId = Opaque<'GestaltLinkId', Id>;
type GestaltLinkIdString = Opaque<'GestaltLinkIdString', string>;

// Notifications

type NotificationId = Opaque<'NotificationId', Id>;
type NotificationIdString = Opaque<'NotificationIdString', string>;
type NotificationIdEncoded = Opaque<'NotificationIdEncoded', string>;

export type {
  PermissionId,
  PermissionIdString,
  CertId,
  CertIdString,
  CertIdEncoded,
  NodeId,
  NodeIdString,
  NodeIdEncoded,
  VaultId,
  VaultIdString,
  VaultIdEncoded,
  TaskId,
  TaskIdString,
  TaskIdEncoded,
  TaskHandlerId,
  ClaimId,
  ClaimIdString,
  ClaimIdEncoded,
  ProviderId,
  IdentityId,
  ProviderIdentityId,
  ProviderIdentityIdEncoded,
  ProviderIdentityClaimId,
  GestaltId,
  GestaltIdEncoded,
  GestaltLinkId,
  GestaltLinkIdString,
  NotificationId,
  NotificationIdString,
  NotificationIdEncoded,
};
