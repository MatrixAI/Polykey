import { ErrorPolykey } from '../errors';

class ErrorCLI extends ErrorPolykey {}

class ErrorGRPCNotStarted extends ErrorCLI {}

class ErrorSecretPathFormat extends ErrorCLI {}

export { ErrorCLI, ErrorGRPCNotStarted, ErrorSecretPathFormat };
