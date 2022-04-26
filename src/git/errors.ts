import { ErrorPolykey } from '../errors';

class ErrorGit<T> extends ErrorPolykey<T> {}

class ErrorRepositoryUndefined<T> extends ErrorGit<T> {}

class ErrorGitPermissionDenied<T> extends ErrorGit<T> {}

class ErrorGitUndefinedRefs<T> extends ErrorGit<T> {}

class ErrorGitUndefinedType<T> extends ErrorGit<T> {}

class ErrorGitReadObject<T> extends ErrorGit<T> {}

class ErrorGitUnimplementedMethod<T> extends ErrorGit<T> {}

export {
  ErrorGit,
  ErrorRepositoryUndefined,
  ErrorGitPermissionDenied,
  ErrorGitUndefinedRefs,
  ErrorGitUndefinedType,
  ErrorGitReadObject,
  ErrorGitUnimplementedMethod,
};
