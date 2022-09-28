import type { Id } from '@matrixai/id';
import type { Opaque } from '../types';

type PermissionId = Opaque<'PermissionId', Id>;
type PermissionIdString = Opaque<'PermissionIdString', string>;

type CertificateId = Opaque<'CertificateId', Id>;
type CertificateIdString = Opaque<'CertificateIdString', string>;
type CertificateIdEncoded = Opaque<'CertificateIdEncoded', string>;

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
 * An arbitrary string serving as a unique identitifer for a particular claim.
 * Depending on the domain the claim is used in, its implementation detail will
 * differ. For example, the sigchain domain uses a lexicographic-integer as the
 * claim ID (representing the sequence number key of the claim).
 */
type ClaimId = Opaque<'ClaimId', Id>;
type ClaimIdString = Opaque<'ClaimIdString', string>;
type ClaimIdEncoded = Opaque<'ClaimIdEncoded', string>;

type NotificationId = Opaque<'NotificationId', Id>;
type NotificationIdString = Opaque<'NotificationIdString', string>;
type NotificationIdEncoded = Opaque<'NotificationIdEncoded', string>;

export type {
  PermissionId,
  PermissionIdString,
  CertificateId,
  CertificateIdString,
  CertificateIdEncoded,
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
  NotificationId,
  NotificationIdString,
  NotificationIdEncoded,
};
