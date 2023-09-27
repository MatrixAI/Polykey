import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorGit<T> extends ErrorPolykey<T> {}

class ErrorRepositoryUndefined<T> extends ErrorGit<T> {}

class ErrorGitPermissionDenied<T> extends ErrorGit<T> {}

class ErrorGitUndefinedRefs<T> extends ErrorGit<T> {
  static description = 'Invalid ref';
  exitCode = sysexits.UNKNOWN;
}

class ErrorGitUndefinedType<T> extends ErrorGit<T> {
  static description = 'Invalid data type';
  exitCode = sysexits.CONFIG;
}

class ErrorGitReadObject<T> extends ErrorGit<T> {
  static description = 'Failed to read object';
  exitCode = sysexits.IOERR;
}

class ErrorGitUnimplementedMethod<T> extends ErrorGit<T> {
  static description = 'Invalid request';
  exitCode = sysexits.USAGE;
}

export {
  ErrorGit,
  ErrorRepositoryUndefined,
  ErrorGitPermissionDenied,
  ErrorGitUndefinedRefs,
  ErrorGitUndefinedType,
  ErrorGitReadObject,
  ErrorGitUnimplementedMethod,
};
