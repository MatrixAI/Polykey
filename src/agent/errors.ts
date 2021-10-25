import { ErrorPolykey } from '../errors';

class ErrorAgent extends ErrorPolykey {}

class ErrorAgentRunning extends ErrorPolykey {}

class ErrorAgentClientNotStarted extends ErrorAgent {}

class ErrorAgentClientDestroyed extends ErrorAgent {}

export {
  ErrorAgent,
  ErrorAgentClientNotStarted,
  ErrorAgentRunning,
  ErrorAgentClientDestroyed,
};
