import { ErrorPolykey, sysexits } from '../errors';

class ErrorACL<T> extends ErrorPolykey<T> {}

class ErrorACLRunning<T> extends ErrorACL<T> {
  static description = 'ACL is running';
  exitCode = sysexits.USAGE;
}

class ErrorACLNotRunning<T> extends ErrorACL<T> {
  static description = 'ACL is not running';
  exitCode = sysexits.USAGE;
}

class ErrorACLDestroyed<T> extends ErrorACL<T> {
  static description = 'ACL is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorACLNodeIdMissing<T> extends ErrorACL<T> {
  static description = 'Could not find NodeId';
  exitCode = sysexits.NOUSER;
}

class ErrorACLVaultIdMissing<T> extends ErrorACL<T> {
  static description = 'Could not find VaultId';
  exitCode = sysexits.DATAERR;
}

class ErrorACLNodeIdExists<T> extends ErrorACL<T> {
  static description = 'NodeId already exists';
  exitCode = sysexits.DATAERR;
}

export {
  ErrorACL,
  ErrorACLRunning,
  ErrorACLNotRunning,
  ErrorACLDestroyed,
  ErrorACLNodeIdMissing,
  ErrorACLVaultIdMissing,
  ErrorACLNodeIdExists,
};
