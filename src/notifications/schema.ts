import type { Notification, GestaltInvite, VaultShare, General } from './types';
import type { JSONSchemaType, ValidateFunction } from 'ajv';
import Ajv from 'ajv';
import NotificationSchema from './Notification.json';
import GestaltInviteSchema from './GestaltInvite.json';
import VaultShareSchema from './VaultShare.json';
import GeneralSchema from './General.json';

const ajv = new Ajv();

const gestaltInviteSchema =
  GestaltInviteSchema as JSONSchemaType<GestaltInvite>;
const gestaltInviteNotificationValidate: ValidateFunction<GestaltInvite> =
  ajv.compile(gestaltInviteSchema);

const vaultShareSchema = VaultShareSchema as JSONSchemaType<VaultShare>;
const vaultShareNotificationValidate: ValidateFunction<VaultShare> =
  ajv.compile(vaultShareSchema);

const generalSchema = GeneralSchema as JSONSchemaType<General>;
const generalNotificationValidate: ValidateFunction<General> =
  ajv.compile(generalSchema);

const notificationSchema = NotificationSchema as JSONSchemaType<Notification>;
const notificationValidate: ValidateFunction<Notification> =
  ajv.compile(notificationSchema);

export {
  notificationValidate,
  generalNotificationValidate,
  gestaltInviteNotificationValidate,
  vaultShareNotificationValidate,
};
