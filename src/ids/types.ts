import type { Id } from '@matrixai/id';
import type { Opaque } from '../types';

type PermissionId = Opaque<'PermissionId', Id>;
type PermissionIdString = Opaque<'PermissionIdString', string>;

type CertId = Opaque<'CertId', Id>;
type CertIdString = Opaque<'CertIdString', string>;
/**
 * This must be a raw lowercase base16 string and not a multibase string.
 * The x509 certificate will strip any non-hex characters and add padding
 * to the nearest byte.
 */
type CertIdEncoded = Opaque<'CertIdEncoded', string>;

type NodeId = Opaque<'NodeId', Id>;
type NodeIdString = Opaque<'NodeIdString', string>;
type NodeIdEncoded = Opaque<'NodeIdEncoded', string>;

type VaultId = Opaque<'VaultId', Id>;
type VaultIdString = Opaque<'VaultIdString', string>;
type VaultIdEncoded = Opaque<'VaultIdEncoded', string>;

type TaskId = Opaque<'TaskId', Id>;
type TaskIdString = Opaque<'TaskIdEncoded', string>;
type TaskIdEncoded = Opaque<'TaskIdEncoded', string>;

type TaskHandlerId = Opaque<'TaskHandlerId', string>;

/**
 * Provider Id identifies an identity provider.
 * e.g. `github.com`
 */
type ProviderId = Opaque<'ProviderId', string>;

/**
 * Identity Id must uniquely identify the identity on the identity provider.
 * It must be the key that is used to look up the identity.
 * If the provider uses a non-string type, make the necessary conversions.
 */
type IdentityId = Opaque<'IdentityId', string>;

/**
 * Composition of ProviderId and IdentityId.
 * This is a JSON encoding of `[ProviderId, IdentityId]`
 */
type ProviderIdentityId = Opaque<'ProviderIdentityId', string>;

type ClaimId = Opaque<'ClaimId', Id>;
type ClaimIdString = Opaque<'ClaimIdString', string>;
type ClaimIdEncoded = Opaque<'ClaimIdEncoded', string>;

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
  ProviderId,
  IdentityId,
  ProviderIdentityId,
  ClaimId,
  ClaimIdString,
  ClaimIdEncoded,
  NotificationId,
  NotificationIdString,
  NotificationIdEncoded,
};
