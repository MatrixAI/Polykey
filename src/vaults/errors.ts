import { ErrorPolykey, sysexits } from '../errors';

class ErrorVaults extends ErrorPolykey {}

class ErrorVaultManagerRunning extends ErrorVaults {
  description = 'VaultManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultManagerNotRunning extends ErrorVaults {
  description = 'VaultManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultManagerDestroyed extends ErrorVaults {
  description = 'VaultManager is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorVaultManagerKey extends ErrorVaults {
  description = 'Vault key is invalid';
  exitCode = sysexits.CONFIG;
}

class ErrorVaultManagerEFS extends ErrorVaults {
  description = 'EFS failed';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorVault extends ErrorVaults {}

class ErrorVaultRunning extends ErrorVault {
  description = 'Vault is running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultNotRunning extends ErrorVault {
  description = 'Vault is not running';
  exitCode = sysexits.USAGE;
}

class ErrorVaultDestroyed extends ErrorVault {
  description = 'Vault is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorVaultReferenceInvalid extends ErrorVault {
  description = 'Reference is invalid';
  exitCode = sysexits.USAGE;
}

class ErrorVaultReferenceMissing extends ErrorVault {
  description = 'Reference does not exist';
  exitCode = sysexits.USAGE;
}

class ErrorVaultRemoteDefined extends ErrorVaults {
  description = 'Vault is a clone of a remote vault and can not be mutated';
  exitCode = sysexits.USAGE;
}

class ErrorVaultRemoteUndefined extends ErrorVaults {
  description = 'Vault has no remote set and can not be pulled';
  exitCode = sysexits.USAGE;
}

// --- these need to be reviewed

class ErrorVaultsVaultUndefined extends ErrorVaults {
  description = 'Vault does not exist';
  exitCode = 10;
}

class ErrorVaultsVaultDefined extends ErrorVaults {}

class ErrorVaultsRecursive extends ErrorVaults {}

class ErrorVaultsVaultUnlinked extends ErrorVaults {}

class ErrorVaultsCreateVaultId extends ErrorVaults {}

class ErrorVaultsInvalidVaultId extends ErrorVaults {} // TODO: Assign a proper error code and message.

class ErrorVaultsMergeConflict extends ErrorVaults {}

class ErrorVaultsPermissionDenied extends ErrorVaults {}

class ErrorVaultsNameConflict extends ErrorVaults {
  description = 'Unique name could not be created';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorSecrets extends ErrorPolykey {}

class ErrorSecretsSecretUndefined extends ErrorSecrets {}

class ErrorSecretsSecretDefined extends ErrorSecrets {}

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
  ErrorVaultsVaultUnlinked,
  ErrorVaultsCreateVaultId,
  ErrorVaultsInvalidVaultId,
  ErrorVaultsMergeConflict,
  ErrorVaultsPermissionDenied,
  ErrorVaultsNameConflict,
  ErrorSecrets,
  ErrorSecretsSecretUndefined,
  ErrorSecretsSecretDefined,
};
