import { ErrorPolykey } from '../errors';

class ErrorStatus extends ErrorPolykey {}

class ErrorStatusNotRunning extends ErrorStatus {}

class ErrorStatusLockFailed extends ErrorStatus {}

export { ErrorStatus, ErrorStatusNotRunning, ErrorStatusLockFailed };
