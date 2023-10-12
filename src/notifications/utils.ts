import type {
  General,
  GestaltInvite,
  VaultShare,
  Notification,
  SignedNotification,
} from './types';
import type { NodeId, VaultId } from '../ids/types';
import type { KeyPairLocked } from '../keys/types';
import * as notificationsErrors from './errors';
import { createNotificationIdGenerator } from '../ids';
import * as nodesUtils from '../nodes/utils';
import * as keysUtils from '../keys/utils';
import Token from '../tokens/Token';
import * as validationErrors from '../validation/errors';
import * as utils from '../utils';
import * as ids from '../ids';
import { vaultActions } from '../vaults/types';
import { never } from '../utils';

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
async function generateNotification(
  notification: Notification,
  keyPair: KeyPairLocked,
): Promise<SignedNotification> {
  const token = Token.fromPayload({
    ...notification,
    iat: Date.now() / 1000,
  });
  token.signWithPrivateKey(keyPair.privateKey);
  return JSON.stringify(token.toJSON()) as SignedNotification;
}

/**
 * Verify, decode, validate, and return a notification. Assumes it was signed
 * using signNotification as a SignJWT.
 */
async function verifyAndDecodeNotif(
  signedNotification: SignedNotification,
  nodeId: NodeId,
): Promise<Notification> {
  const token = Token.fromEncoded(JSON.parse(signedNotification));
  assertNotification(token.payload);
  const issuerNodeId = nodesUtils.decodeNodeId(token.payload.iss);
  if (issuerNodeId == null) never();
  const issuerPublicKey = keysUtils.publicKeyFromNodeId(issuerNodeId);
  if (!token.verifyWithPublicKey(issuerPublicKey)) {
    throw new notificationsErrors.ErrorNotificationsVerificationFailed();
  }
  if (token.payload.sub !== nodesUtils.encodeNodeId(nodeId)) {
    throw new notificationsErrors.ErrorNotificationsInvalidDestination();
  }
  const payload = token.payload;
  return parseNotification(payload);
}

/**
 * JSON schema validator for a notification type
 */
function assertNotification(
  notification: unknown,
): asserts notification is Notification {
  if (!utils.isObject(notification)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (notification['typ'] !== 'notification') {
    throw new validationErrors.ErrorParse('Payload typ was not a notification');
  }
  if (
    notification['iss'] == null ||
    ids.decodeNodeId(notification['iss']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`iss` property must be an encoded node ID',
    );
  }
  if (
    notification['sub'] == null ||
    ids.decodeNodeId(notification['sub']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`sub` property must be an encoded node ID',
    );
  }
  if (typeof notification['isRead'] !== 'boolean') {
    throw new validationErrors.ErrorParse(
      '`isRead` property must be a boolean',
    );
  }
  // Checking the data
  const notificationData = notification['data'];
  if (notificationData !== null && !utils.isObject(notificationData)) {
    throw new validationErrors.ErrorParse('`data` property must be a POJO');
  }
  if (typeof notificationData['type'] !== 'string') {
    throw new validationErrors.ErrorParse('`type` property must be a string');
  }
  switch (notificationData['type']) {
    case 'GestaltInvite':
      assertGestaltInvite(notificationData);
      break;
    case 'VaultShare':
      assertVaultShare(notificationData);
      break;
    case 'General':
      assertGeneral(notificationData);
      break;
    default:
      throw new validationErrors.ErrorParse(
        '`type` property must be a valid type',
      );
  }
}

function parseNotification(signedNotification: unknown): Notification {
  assertNotification(signedNotification);
  return signedNotification;
}

/**
 * JSON schema validator for a General notification's data field
 */
function assertGeneral(general: unknown): asserts general is General {
  if (!utils.isObject(general)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (general['type'] !== 'General') {
    throw new validationErrors.ErrorParse('`type` property must be `General`');
  }
  if (typeof general['message'] !== 'string') {
    throw new validationErrors.ErrorParse(
      '`message` property must be a string',
    );
  }
}

/**
 * JSON schema validator for a GestaltInvite notification's data field
 */
function assertGestaltInvite(
  gestaltInvite: unknown,
): asserts gestaltInvite is GestaltInvite {
  if (!utils.isObject(gestaltInvite)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (gestaltInvite['type'] !== 'GestaltInvite') {
    throw new validationErrors.ErrorParse(
      '`type` property must be `GestaltInvite`',
    );
  }
}

/**
 * JSON schema validator for a VaultShare notification's data field
 */
function assertVaultShare(
  vaultShare: unknown,
): asserts vaultShare is VaultShare {
  if (!utils.isObject(vaultShare)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (vaultShare['type'] !== 'VaultShare') {
    throw new validationErrors.ErrorParse(
      '`type` property must be `VaultShare`',
    );
  }
  if (
    vaultShare['vaultId'] == null ||
    ids.decodeVaultId(vaultShare['vaultId']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`vaultId` property must be an encoded vault ID',
    );
  }
  if (typeof vaultShare['vaultName'] !== 'string') {
    throw new validationErrors.ErrorParse(
      '`vaultName` property must be a string',
    );
  }
  if (
    vaultShare['actions'] !== null &&
    !utils.isObject(vaultShare['actions'])
  ) {
    throw new validationErrors.ErrorParse('`actions` property must be a POJO');
  }
  for (const action of Object.keys(vaultShare['actions'])) {
    if (vaultActions.find((i) => action === i) == null) {
      throw new validationErrors.ErrorParse(
        '`actions` property must contain valid actions',
      );
    }
  }
}

export {
  createNotificationIdGenerator,
  generateNotification,
  verifyAndDecodeNotif,
  constructGestaltInviteMessage,
  constructVaultShareMessage,
  assertNotification,
  parseNotification,
  assertGeneral,
  assertGestaltInvite,
  assertVaultShare,
};
