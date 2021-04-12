import { ErrorPolykey } from '../errors';

class ErrorVaults extends ErrorPolykey {}

class ErrorSecrets extends ErrorPolykey {}

class ErrorVaultUndefined extends ErrorVaults {}

class ErrorVaultDefined extends ErrorVaults {}

class ErrorRemoteVaultUndefined extends ErrorVaults {}

class ErrorVaultUninitialised extends ErrorVaults {}

class ErrorRecursive extends ErrorVaults {}

class ErrorMalformedVaultDBValue extends ErrorVaults {}

class ErrorCreateVaultId extends ErrorVaults {}

class ErrorSecretUndefined extends ErrorSecrets {}

class ErrorSecretDefined extends ErrorSecrets {}

class ErrorReadingSecret extends ErrorSecrets {}

class ErrorGitFile extends ErrorSecrets {}

export {
  ErrorVaults,
  ErrorVaultUndefined,
  ErrorVaultDefined,
  ErrorRemoteVaultUndefined,
  ErrorVaultUninitialised,
  ErrorRecursive,
  ErrorMalformedVaultDBValue,
  ErrorCreateVaultId,
  ErrorSecretUndefined,
  ErrorSecretDefined,
  ErrorReadingSecret,
  ErrorGitFile,
};
