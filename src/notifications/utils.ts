import type {
  General,
  GestaltInvite,
  VaultShare,
  Notification,
  SignedNotification, NotificationId, NotificationIdGenerator
} from "./types";
import type { KeyPairPem } from '../keys/types';
import type { NodeId } from '../nodes/types';
import type { VaultId } from '../vaults/types';

import EmbeddedJWK from 'jose/jwk/embedded';
import jwtVerify from 'jose/jwt/verify';
import { createPublicKey, createPrivateKey } from 'crypto';
import { SignJWT } from 'jose/jwt/sign';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { DefinedError } from 'ajv';

import {
  notificationValidate,
  generalNotificationValidate,
  gestaltInviteNotificationValidate,
  vaultShareNotificationValidate,
} from './schema';
import * as notificationsErrors from './errors';
import { IdSortable } from "@matrixai/id";
import { isId, makeId } from "@/GenericIdTypes";

function isNotificationId(arg: any):arg is NotificationId {
  return isId<NotificationId>(arg);
}

function makeNotificationId(arg: any){
  return makeId<NotificationId>(arg);
}

function CreateNotificationIdGenerator(lastId?: NotificationId): NotificationIdGenerator{
  const idSortableGenerator = new IdSortable({
    lastId,
  });
  return (): NotificationId => makeNotificationId(idSortableGenerator.get());
}

function constructGestaltInviteMessage(nodeId: NodeId): string {
  return `Keynode with ID ${nodeId} has invited this Keynode to join their Gestalt. Accept this invitation by typing the command: xxx`;
}

/**
 * Dummy for now
 */
function constructVaultShareMessage(vaultId: VaultId): string {
  return `xxx has shared their vault with ID ${vaultId} with you.`;
}

/**
 * Sign and encode a notification so it can be sent. Encoded as a
 * SignJWT type (Compact JWS formatted JWT string).
 */
async function signNotification(
  notification: Notification,
  keyPair: KeyPairPem,
): Promise<SignedNotification> {
  const publicKey = createPublicKey(keyPair.publicKey);
  const privateKey = createPrivateKey(keyPair.privateKey);
  const jwkPublicKey = await fromKeyLike(publicKey);
  const jwt = await new SignJWT(notification)
    .setProtectedHeader({ alg: 'RS256', b64: true, jwk: jwkPublicKey })
    .setIssuedAt()
    .sign(privateKey);
  return jwt as SignedNotification;
}

/**
 * Verify, decode, validate, and return a notification. Assumes it was signed
 * using signNotification as a SignJWT.
 */
async function verifyAndDecodeNotif(notifJWT: string): Promise<Notification> {
  try {
    const { payload } = await jwtVerify(notifJWT, EmbeddedJWK, {});
    return validateNotification(payload);
  } catch (err) {
    if (err instanceof notificationsErrors.ErrorNotificationsInvalidType) {
      throw err;
    } else if (
      err instanceof notificationsErrors.ErrorNotificationsValidationFailed
    ) {
      throw err;
    } else {
      // Error came from jose
      throw new notificationsErrors.ErrorNotificationsParse();
    }
  }
}

/**
 * JSON schema validator for a notification type
 */
function validateNotification(
  notification: Record<string, unknown>,
): Notification {
  if (notificationValidate(notification)) {
    return notification as Notification;
  } else {
    for (const err of notificationValidate.errors as DefinedError[]) {
      if (err.keyword === 'oneOf') {
        throw new notificationsErrors.ErrorNotificationsInvalidType();
      }
    }
    throw new notificationsErrors.ErrorNotificationsValidationFailed();
  }
}

/**
 * JSON schema validator for a General notification's data field
 */
function validateGeneralNotification(data: Record<string, unknown>): General {
  if (generalNotificationValidate(data)) {
    return data as General;
  } else {
    throw new notificationsErrors.ErrorNotificationsGeneralInvalid();
  }
}

/**
 * JSON schema validator for a GestaltInvite notification's data field
 */
function validateGestaltInviteNotification(
  data: Record<string, unknown>,
): GestaltInvite {
  if (gestaltInviteNotificationValidate(data)) {
    return data as GestaltInvite;
  } else {
    throw new notificationsErrors.ErrorNotificationsGestaltInviteInvalid();
  }
}

/**
 * JSON schema validator for a VaultShare notification's data field
 */
function validateVaultShareNotification(
  data: Record<string, unknown>,
): VaultShare {
  if (vaultShareNotificationValidate(data)) {
    return data as VaultShare;
  } else {
    throw new notificationsErrors.ErrorNotificationsVaultShareInvalid();
  }
}

export {
  isNotificationId,
  makeNotificationId,
  CreateNotificationIdGenerator,
  signNotification,
  verifyAndDecodeNotif,
  constructGestaltInviteMessage,
  constructVaultShareMessage,
  validateNotification,
  validateGeneralNotification,
  validateGestaltInviteNotification,
  validateVaultShareNotification,
};
