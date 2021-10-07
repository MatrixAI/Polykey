import { ErrorForwardProxyNotStarted, ErrorPolykey } from "../errors";

class ErrorVaults extends ErrorPolykey {}

class ErrorSecrets extends ErrorPolykey {}

class ErrorVaultManagerDestroyed extends ErrorVaults {}

class ErrorVaultUndefined extends ErrorVaults {
  description: string = 'Vault does not exist';
  exitCode: number = 10;
}

class ErrorVaultDefined extends ErrorVaults {}

class ErrorRemoteVaultUndefined extends ErrorVaults {}

class ErrorVaultUninitialised extends ErrorVaults {}

class ErrorVaultNotStarted extends ErrorVaults {}

class ErrorVaultDestroyed extends ErrorVaults {}

class ErrorRecursive extends ErrorVaults {}

class ErrorVaultModified extends ErrorVaults {}

class ErrorMalformedVaultDBValue extends ErrorVaults {}

class ErrorVaultUnlinked extends ErrorVaults {}

class ErrorCreateVaultId extends ErrorVaults {}

class ErrorInvalidVaultId extends ErrorVaults {}

class ErrorVaultMergeConflict extends ErrorVaults {}

class ErrorVaultCommitUndefined extends ErrorVaults {
  description: string = 'Commit does not exist';
  exitCode: number = 10;
}

class ErrorSecretUndefined extends ErrorSecrets {}

class ErrorSecretDefined extends ErrorSecrets {}

class ErrorReadingSecret extends ErrorSecrets {}

class ErrorGitFile extends ErrorSecrets {}

export {
  ErrorVaults,
  ErrorVaultManagerDestroyed,
  ErrorVaultUndefined,
  ErrorVaultDefined,
  ErrorRemoteVaultUndefined,
  ErrorVaultUninitialised,
  ErrorVaultNotStarted,
  ErrorVaultDestroyed,
  ErrorRecursive,
  ErrorVaultModified,
  ErrorMalformedVaultDBValue,
  ErrorVaultUnlinked,
  ErrorCreateVaultId,
  ErrorInvalidVaultId,
  ErrorVaultMergeConflict,
  ErrorVaultCommitUndefined,
  ErrorSecretUndefined,
  ErrorSecretDefined,
  ErrorReadingSecret,
  ErrorGitFile,
};
