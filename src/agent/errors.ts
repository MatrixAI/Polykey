import { ErrorPolykey, sysexits } from '../errors';

class ErrorAgent<T> extends ErrorPolykey<T> {}

class ErrorAgentRunning<T> extends ErrorPolykey<T> {}

class ErrorAgentClientNotStarted<T> extends ErrorAgent<T> {}

class ErrorAgentClientDestroyed<T> extends ErrorAgent<T> {}

class ErrorConnectionInfoMissing<T> extends ErrorAgent<T> {
  static description = 'Vault already exists';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorAgent,
  ErrorAgentClientNotStarted,
  ErrorAgentRunning,
  ErrorAgentClientDestroyed,
  ErrorConnectionInfoMissing,
};
