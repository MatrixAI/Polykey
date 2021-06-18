import { ErrorPolykey } from '../errors';

class ErrorVaults extends ErrorPolykey {}

class ErrorSecrets extends ErrorPolykey {}

class ErrorVaultManagerNotStarted extends ErrorVaults {}

class ErrorVaultUndefined extends ErrorVaults {
  description: string = 'Vault does not exist';
  exitCode: number = 10;
}

class ErrorVaultDefined extends ErrorVaults {}

class ErrorRemoteVaultUndefined extends ErrorVaults {}

class ErrorVaultUninitialised extends ErrorVaults {}

class ErrorRecursive extends ErrorVaults {}

class ErrorVaultModified extends ErrorVaults {}

class ErrorMalformedVaultDBValue extends ErrorVaults {}

class ErrorVaultUnlinked extends ErrorVaults {}

class ErrorCreateVaultId extends ErrorVaults {}

class ErrorVaultMap extends ErrorVaults {}

class ErrorVaultMapNotStarted extends ErrorVaultMap {}

class ErrorVaultMapNodeIdMissing extends ErrorVaultMap {}

class ErrorVaultMapVaultIdMissing extends ErrorVaultMap {}

class ErrorVaultMapDecrypt extends ErrorVaultMap {}

class ErrorVaultMapParse extends ErrorVaultMap {}

class ErrorSecretUndefined extends ErrorSecrets {}

class ErrorSecretDefined extends ErrorSecrets {}

class ErrorReadingSecret extends ErrorSecrets {}

class ErrorGitFile extends ErrorSecrets {}

export {
  ErrorVaults,
  ErrorVaultManagerNotStarted,
  ErrorVaultUndefined,
  ErrorVaultDefined,
  ErrorRemoteVaultUndefined,
  ErrorVaultUninitialised,
  ErrorRecursive,
  ErrorVaultModified,
  ErrorMalformedVaultDBValue,
  ErrorVaultUnlinked,
  ErrorCreateVaultId,
  ErrorVaultMap,
  ErrorVaultMapNotStarted,
  ErrorVaultMapNodeIdMissing,
  ErrorVaultMapVaultIdMissing,
  ErrorVaultMapDecrypt,
  ErrorVaultMapParse,
  ErrorSecretUndefined,
  ErrorSecretDefined,
  ErrorReadingSecret,
  ErrorGitFile,
};
