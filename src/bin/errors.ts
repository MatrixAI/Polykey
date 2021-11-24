import ErrorPolykey from '../ErrorPolykey';

class ErrorCLI extends ErrorPolykey {}

class ErrorCLINodePath extends ErrorPolykey {
  description = 'Cannot derive default node path from unknown platform';
  exitCode = 64;
}

class ErrorInvalidArguments extends ErrorCLI {
  description: string = 'An invalid combination of arguments was supplied';
  exitCode: number = 64;
}

class ErrorGRPCNotStarted extends ErrorCLI {}

class ErrorSecretPathFormat extends ErrorCLI {
  description: string =
    "Secret name needs to be of format: '<vaultName>:<secretPath>'";
  exitCode: number = 64;
}

class ErrorVaultNameAmbiguous extends ErrorCLI {
  description: string =
    'There is more than 1 Vault with this name. Please specify a Vault ID';
  exitCode = 1;
}

class ErrorSecretsUndefined extends ErrorCLI {
  description: string = 'At least one secret must be specified as an argument';
  exitCode: number = 64;
}

class ErrorNodeFindFailed extends ErrorCLI {
  description: string = 'Failed to find the node in the DHT';
  exitCode: number = 1;
}

class ErrorNodePingFailed extends ErrorCLI {
  description: string = 'Node was not online or not found.';
  exitCode: number = 1;
}

export {
  ErrorCLI,
  ErrorCLINodePath,
  ErrorGRPCNotStarted,
  ErrorSecretPathFormat,
  ErrorVaultNameAmbiguous,
  ErrorSecretsUndefined,
  ErrorInvalidArguments,
  ErrorNodeFindFailed,
  ErrorNodePingFailed,
};
