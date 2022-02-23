import { ErrorPolykey, sysexits } from '../errors';

class ErrorAgent extends ErrorPolykey {}

class ErrorAgentRunning extends ErrorPolykey {}

class ErrorAgentClientNotStarted extends ErrorAgent {}

class ErrorAgentClientDestroyed extends ErrorAgent {}

class ErrorConnectionInfoMissing extends ErrorAgent {
  description = 'Vault already exists';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorAgent,
  ErrorAgentClientNotStarted,
  ErrorAgentRunning,
  ErrorAgentClientDestroyed,
  ErrorConnectionInfoMissing,
};
