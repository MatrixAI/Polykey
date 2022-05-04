import { ErrorPolykey, sysexits } from '../errors';

class ErrorNotifications<T> extends ErrorPolykey<T> {}

class ErrorNotificationsRunning<T> extends ErrorNotifications<T> {
  static description = 'NotiticationsManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorNotificationsNotRunning<T> extends ErrorNotifications<T> {
  static description = 'NotiticationsManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNotificationsDestroyed<T> extends ErrorNotifications<T> {
  static description = 'NotiticationsManager is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorNotificationsPermissionsNotFound<T> extends ErrorNotifications<T> {
  static description = 'Could not find permissions for NodeId';
  exitCode = sysexits.NOUSER;
}

class ErrorNotificationsDb<T> extends ErrorNotifications<T> {
  static description = 'Database consistency error';
  exitCode = sysexits.IOERR;
}

class ErrorNotificationsParse<T> extends ErrorNotifications<T> {
  static description = 'Unable to verify notification';
  exitCode = sysexits.IOERR;
}

/**
 * Exceptions raised when validating a Notification against a JSON schema
 */
class ErrorSchemaValidate<T> extends ErrorNotifications<T> {}

class ErrorNotificationsInvalidType<T> extends ErrorSchemaValidate<T> {
  static description = 'Invalid notification type';
  exitCode = sysexits.USAGE;
}

class ErrorNotificationsGeneralInvalid<T> extends ErrorSchemaValidate<T> {
  static description = 'Invalid notification data';
  exitCode = sysexits.USAGE;
}

class ErrorNotificationsGestaltInviteInvalid<T> extends ErrorSchemaValidate<T> {
  static description = 'Invalid notification data';
  exitCode = sysexits.USAGE;
}

class ErrorNotificationsVaultShareInvalid<T> extends ErrorSchemaValidate<T> {
  static description = 'Invalid notification data';
  exitCode = sysexits.USAGE;
}

class ErrorNotificationsValidationFailed<T> extends ErrorSchemaValidate<T> {
  static description = 'Notification does not match schema';
  exitCode = sysexits.USAGE;
}

export {
  ErrorNotifications,
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
