import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorWorkers<T> extends ErrorPolykey<T> {}

class ErrorWorkersInvalidCores<T> extends ErrorWorkers<T> {
  static description = 'specified cores must be positive or 0';
  exitCode = sysexits.USAGE;
}

export { ErrorWorkersInvalidCores };
