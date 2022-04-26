import { ErrorPolykey } from '../errors';

class ErrorNotifications<T> extends ErrorPolykey<T> {}

class ErrorNotificationsUnknownNode<T> extends ErrorNotifications<T> {}

class ErrorNotificationsRunning<T> extends ErrorNotifications<T> {}

class ErrorNotificationsNotRunning<T> extends ErrorNotifications<T> {}

class ErrorNotificationsDestroyed<T> extends ErrorNotifications<T> {}

class ErrorNotificationsPermissionsNotFound<T> extends ErrorNotifications<T> {}

class ErrorNotificationsDb<T> extends ErrorNotifications<T> {}

class ErrorNotificationsParse<T> extends ErrorNotifications<T> {}

/**
 * Exceptions raised when validating a Notification against a JSON schema
 */
class ErrorSchemaValidate<T> extends ErrorNotifications<T> {}

class ErrorNotificationsInvalidType<T> extends ErrorSchemaValidate<T> {}

class ErrorNotificationsGeneralInvalid<T> extends ErrorSchemaValidate<T> {}

class ErrorNotificationsGestaltInviteInvalid<
  T,
> extends ErrorSchemaValidate<T> {}

class ErrorNotificationsVaultShareInvalid<T> extends ErrorSchemaValidate<T> {}

class ErrorNotificationsValidationFailed<T> extends ErrorSchemaValidate<T> {}

export {
  ErrorNotifications,
  ErrorNotificationsUnknownNode,
  ErrorNotificationsRunning,
  ErrorNotificationsNotRunning,
  ErrorNotificationsDestroyed,
  ErrorNotificationsPermissionsNotFound,
  ErrorNotificationsDb,
  ErrorNotificationsParse,
  ErrorNotificationsInvalidType,
  ErrorNotificationsGeneralInvalid,
  ErrorNotificationsGestaltInviteInvalid,
  ErrorNotificationsVaultShareInvalid,
  ErrorNotificationsValidationFailed,
};
