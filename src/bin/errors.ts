import { ErrorPolykey } from '../errors';

class ErrorCLI extends ErrorPolykey {}

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

class ErrorInvalidArguments extends ErrorCLI {
  description: string = 'An invalid combination of arguments was supplied';
  exitCode: number = 64;
}

class ErrorPingNodeFailed extends ErrorCLI {
  description: string = 'Node was not online or not found.';
  exitCode: number = 1;
}

class ErrorFindNodeFailed extends ErrorCLI {
  description: string = 'Failed to find the node in the DHT';
  exitCode: number = 1;
}

export {
  ErrorCLI,
  ErrorGRPCNotStarted,
  ErrorSecretPathFormat,
  ErrorVaultNameAmbiguous,
  ErrorSecretsUndefined,
  ErrorInvalidArguments,
  ErrorPingNodeFailed,
  ErrorFindNodeFailed,
};
