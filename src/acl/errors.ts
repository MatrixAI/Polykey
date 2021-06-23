import { ErrorPolykey } from '../errors';

class ErrorACL extends ErrorPolykey {}

class ErrorACLNotStarted extends ErrorACL {}

class ErrorACLNodeIdMissing extends ErrorACL {}

class ErrorACLVaultIdMissing extends ErrorACL {}

class ErrorACLNodeIdExists extends ErrorACL {}

export {
  ErrorACL,
  ErrorACLNotStarted,
  ErrorACLNodeIdMissing,
  ErrorACLVaultIdMissing,
  ErrorACLNodeIdExists,
};
