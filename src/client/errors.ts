import { ErrorPolykey } from '../errors';

class ErrorClient extends ErrorPolykey {}

class ErrorClientClientNotStarted extends ErrorClient {}

export { ErrorClient, ErrorClientClientNotStarted };
