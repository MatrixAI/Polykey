import { ErrorPolykey } from '../errors';

class ErrorACL extends ErrorPolykey {}

class ErrorACLDestroyed extends ErrorACL {}

class ErrorACLNodeIdMissing extends ErrorACL {}

class ErrorACLVaultIdMissing extends ErrorACL {}

class ErrorACLNodeIdExists extends ErrorACL {}

export {
  ErrorACL,
  ErrorACLDestroyed,
  ErrorACLNodeIdMissing,
  ErrorACLVaultIdMissing,
  ErrorACLNodeIdExists,
};
