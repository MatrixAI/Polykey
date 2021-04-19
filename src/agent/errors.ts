import { ErrorPolykey } from '../errors';

class ErrorAgent extends ErrorPolykey {}

class ErrorAgentClientNotStarted extends ErrorAgent {}

export { ErrorAgent, ErrorAgentClientNotStarted };
