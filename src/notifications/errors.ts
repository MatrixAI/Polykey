import { ErrorPolykey } from '../errors';

class ErrorNotifications extends ErrorPolykey {}

class ErrorNotificationsUnknownNode extends ErrorNotifications {}

class ErrorNotificationsPermissionsNotFound extends ErrorNotifications {}

class ErrorNotificationsDb extends ErrorNotifications {}

class ErrorNotificationsParse extends ErrorNotifications {}

/**
 * Exceptions raised when validating a Notification against a JSON schema
 */
class ErrorSchemaValidate extends ErrorNotifications {}

class ErrorNotificationsInvalidType extends ErrorSchemaValidate {}

class ErrorNotificationsGeneralInvalid extends ErrorSchemaValidate {}

class ErrorNotificationsGestaltInviteInvalid extends ErrorSchemaValidate {}

class ErrorNotificationsVaultShareInvalid extends ErrorSchemaValidate {}

class ErrorNotificationsValidationFailed extends ErrorSchemaValidate {}

export {
  ErrorNotifications,
  ErrorNotificationsUnknownNode,
  ErrorNotificationsPermissionsNotFound,
  ErrorNotificationsDb,
  ErrorNotificationsParse,
  ErrorNotificationsInvalidType,
  ErrorNotificationsGeneralInvalid,
  ErrorNotificationsGestaltInviteInvalid,
  ErrorNotificationsVaultShareInvalid,
  ErrorNotificationsValidationFailed,
};
