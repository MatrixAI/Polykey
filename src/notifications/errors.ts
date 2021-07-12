import { ErrorPolykey } from '../errors';

class ErrorNotifications extends ErrorPolykey {}

class ErrorNotificationsUnknownNode extends ErrorNotifications {}

class ErrorNotificationsPermissionsNotFound extends ErrorNotifications {}

class ErrorNotificationsDb extends ErrorNotifications {}

export {
  ErrorNotifications,
  ErrorNotificationsUnknownNode,
  ErrorNotificationsPermissionsNotFound,
  ErrorNotificationsDb,
};
