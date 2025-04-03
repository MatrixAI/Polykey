import ErrorPolykey from '../ErrorPolykey.js';
import sysexits from '../utils/sysexits.js';

class ErrorWorkers<T> extends ErrorPolykey<T> {}

class ErrorWorkersInvalidCores<T> extends ErrorWorkers<T> {
  static description = 'specified cores must be positive or 0';
  exitCode = sysexits.USAGE;
}

export { ErrorWorkersInvalidCores };
