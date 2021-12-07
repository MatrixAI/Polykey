import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorCLI extends ErrorPolykey {}

class ErrorCLINodePath extends ErrorCLI {
  description = 'Cannot derive default node path from unknown platform';
  exitCode = sysexits.USAGE;
}

class ErrorCLIStatusMissing extends ErrorCLI {
  description =
    'Could not resolve nodeId, clientHost or clientPort from non-existent Status';
  exitCode = sysexits.USAGE;
}

class ErrorCLIStatusNotLive extends ErrorCLI {
  description =
    'Could not resolve nodeId, clientHost or clientPort from Status';
  exitCode = sysexits.USAGE;
}

class ErrorCLIStatusStarting extends ErrorCLI {
  description = 'Agent is starting';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorCLIPolykeyAgentProcess extends ErrorCLI {
  description = 'PolykeyAgent process could not be started';
  exitCode = sysexits.OSERR;
}

class ErrorCLIPasswordMissing extends ErrorCLI {
  description =
    'Password is necessary, provide it via PK_PASSWORD, --password-file or when prompted';
  exitCode = sysexits.USAGE;
}

class ErrorCLIPasswordFileRead extends ErrorCLI {
  description = 'Failed to read password file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIRecoveryCodeFileRead extends ErrorCLI {
  description = 'Failed to read recovery code file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIFileRead extends ErrorCLI {
  description = 'Failed to read file';
  exitCode = sysexits.NOINPUT;
}

class ErrorSecretPathFormat extends ErrorCLI {
  description = "Secret name needs to be of format: '<vaultName>:<secretPath>'";
  exitCode = 64;
}

class ErrorVaultNameAmbiguous extends ErrorCLI {
  description =
    'There is more than 1 Vault with this name. Please specify a Vault ID';
  exitCode = 1;
}

class ErrorSecretsUndefined extends ErrorCLI {
  description = 'At least one secret must be specified as an argument';
  exitCode = 64;
}

class ErrorNodeFindFailed extends ErrorCLI {
  description = 'Failed to find the node in the DHT';
  exitCode = 1;
}

class ErrorNodePingFailed extends ErrorCLI {
  description = 'Node was not online or not found.';
  exitCode = 1;
}

export {
  ErrorCLI,
  ErrorCLINodePath,
  ErrorCLIPasswordMissing,
  ErrorCLIStatusMissing,
  ErrorCLIStatusStarting,
  ErrorCLIStatusNotLive,
  ErrorCLIPolykeyAgentProcess,
  ErrorCLIPasswordFileRead,
  ErrorCLIRecoveryCodeFileRead,
  ErrorCLIFileRead,
  ErrorSecretPathFormat,
  ErrorVaultNameAmbiguous,
  ErrorSecretsUndefined,
  ErrorNodeFindFailed,
  ErrorNodePingFailed,
};
