import { ErrorPolykey } from '../errors';

class ErrorACL extends ErrorPolykey {}

class ErrorACLRunning extends ErrorACL {}

class ErrorACLNotRunning extends ErrorACL {}

class ErrorACLDestroyed extends ErrorACL {}

class ErrorACLNodeIdMissing extends ErrorACL {}

class ErrorACLVaultIdMissing extends ErrorACL {}

class ErrorACLNodeIdExists extends ErrorACL {}

export {
  ErrorACL,
  ErrorACLRunning,
  ErrorACLNotRunning,
  ErrorACLDestroyed,
  ErrorACLNodeIdMissing,
  ErrorACLVaultIdMissing,
  ErrorACLNodeIdExists,
};
