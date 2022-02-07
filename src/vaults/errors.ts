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

// Yes it is immutable
// But this is because you don't own the vault right now

class ErrorVaultImmutable extends ErrorVaults {
  description = 'Vault cannot be mutated';
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
  ErrorVaultImmutable,
  ErrorVaultsVaultUndefined,
  ErrorVaultsVaultDefined,
  ErrorVaultsRecursive,
  ErrorVaultsVaultUnlinked,
  ErrorVaultsCreateVaultId,
  ErrorVaultsInvalidVaultId,
  ErrorVaultsMergeConflict,
  ErrorVaultsPermissionDenied,
  ErrorSecrets,
  ErrorSecretsSecretUndefined,
  ErrorSecretsSecretDefined,
};
