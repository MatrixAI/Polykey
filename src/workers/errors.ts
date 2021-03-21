import { ErrorPolykey } from '../errors';

class ErrorWorkers extends ErrorPolykey {}

class ErrorNotRunning extends ErrorWorkers {}

export { ErrorWorkers, ErrorNotRunning };
