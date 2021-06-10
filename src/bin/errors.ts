import { ErrorPolykey } from '../errors';

class ErrorCLI extends ErrorPolykey {}

class ErrorGRPCNotStarted extends ErrorCLI {}

class ErrorSecretPathFormat extends ErrorCLI {}

class ErrorVaultNameAmbiguous extends ErrorCLI {
  description: string =
    'There is more than 1 Vault with this name. Please specify a Vault ID';
  exitCode = 1;
}

export {
  ErrorCLI,
  ErrorGRPCNotStarted,
  ErrorSecretPathFormat,
  ErrorVaultNameAmbiguous,
};
