import { ErrorPolykey, sysexits } from '../errors';

class ErrorVaults<T> extends ErrorPolykey<T> {}

class ErrorVaultManagerRunning<T> extends ErrorVaults<T> {
  static description = 'VaultManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultManagerNotRunning<T> extends ErrorVaults<T> {
  static description = 'VaultManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultManagerDestroyed<T> extends ErrorVaults<T> {
  static description = 'VaultManager is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorVaultManagerKey<T> extends ErrorVaults<T> {
  static description = 'Vault key is invalid';
  exitCode = sysexits.CONFIG;
}

class ErrorVaultManagerEFS<T> extends ErrorVaults<T> {
  static description = 'EFS failed';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorVault<T> extends ErrorVaults<T> {}

class ErrorVaultRunning<T> extends ErrorVault<T> {
  static description = 'Vault is running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultNotRunning<T> extends ErrorVault<T> {
  static description = 'Vault is not running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultDestroyed<T> extends ErrorVault<T> {
  static description = 'Vault is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorVaultReferenceInvalid<T> extends ErrorVault<T> {
  static description = 'Reference is invalid';
  exitCode = sysexits.USAGE;
}

class ErrorVaultReferenceMissing<T> extends ErrorVault<T> {
  static description = 'Reference does not exist';
  exitCode = sysexits.USAGE;
}

class ErrorVaultRemoteDefined<T> extends ErrorVaults<T> {
  static description =
    'Vault is a clone of a remote vault and can not be mutated';
  exitCode = sysexits.USAGE;
}

class ErrorVaultRemoteUndefined<T> extends ErrorVaults<T> {
  static description = 'Vault has no remote set and can not be pulled';
  exitCode = sysexits.USAGE;
}

class ErrorVaultsVaultUndefined<T> extends ErrorVaults<T> {
  static description = 'Vault does not exist';
  exitCode = sysexits.USAGE;
}

class ErrorVaultsVaultDefined<T> extends ErrorVaults<T> {
  static description = 'Vault already exists';
  exitCode = sysexits.USAGE;
}

class ErrorVaultsRecursive<T> extends ErrorVaults<T> {
  static description = 'Recursive option was not set';
  exitCode = sysexits.USAGE;
}

class ErrorVaultsCreateVaultId<T> extends ErrorVaults<T> {
  static description = 'Failed to create unique VaultId';
  exitCode = sysexits.SOFTWARE;
}

class ErrorVaultsMergeConflict<T> extends ErrorVaults<T> {
  static description = 'Merge Conflicts are not supported yet';
  exitCode = sysexits.SOFTWARE;
}

class ErrorVaultsPermissionDenied<T> extends ErrorVaults<T> {
  static description = 'Permission was denied';
  exitCode = sysexits.NOPERM;
}

class ErrorVaultsNameConflict<T> extends ErrorVaults<T> {
  static description = 'Unique name could not be created';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorSecrets<T> extends ErrorPolykey<T> {}

class ErrorSecretsSecretUndefined<T> extends ErrorSecrets<T> {
  static description = 'Secret does not exist';
  exitCode = sysexits.USAGE;
}

class ErrorSecretsSecretDefined<T> extends ErrorSecrets<T> {
  static description = 'Secret already exists';
  exitCode = sysexits.USAGE;
}

export {
  ErrorVaults,
  ErrorVaultManagerRunning,
  ErrorVaultManagerNotRunning,
  ErrorVaultManagerDestroyed,
  ErrorVaultManagerKey,
  ErrorVaultManagerEFS,
  ErrorVault,
  ErrorVaultRunning,
  ErrorVaultNotRunning,
  ErrorVaultDestroyed,
  ErrorVaultReferenceInvalid,
  ErrorVaultReferenceMissing,
  ErrorVaultRemoteDefined,
  ErrorVaultRemoteUndefined,
  ErrorVaultsVaultUndefined,
  ErrorVaultsVaultDefined,
  ErrorVaultsRecursive,
  ErrorVaultsCreateVaultId,
  ErrorVaultsMergeConflict,
  ErrorVaultsPermissionDenied,
  ErrorVaultsNameConflict,
  ErrorSecrets,
  ErrorSecretsSecretUndefined,
  ErrorSecretsSecretDefined,
};
