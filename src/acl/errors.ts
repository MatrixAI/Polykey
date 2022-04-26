import { ErrorPolykey } from '../errors';

class ErrorACL<T> extends ErrorPolykey<T> {}

class ErrorACLRunning<T> extends ErrorACL<T> {}

class ErrorACLNotRunning<T> extends ErrorACL<T> {}

class ErrorACLDestroyed<T> extends ErrorACL<T> {}

class ErrorACLNodeIdMissing<T> extends ErrorACL<T> {}

class ErrorACLVaultIdMissing<T> extends ErrorACL<T> {}

class ErrorACLNodeIdExists<T> extends ErrorACL<T> {}

export {
  ErrorACL,
  ErrorACLRunning,
  ErrorACLNotRunning,
  ErrorACLDestroyed,
  ErrorACLNodeIdMissing,
  ErrorACLVaultIdMissing,
  ErrorACLNodeIdExists,
};
