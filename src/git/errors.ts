import { ErrorPolykey } from '../errors';

class ErrorGit extends ErrorPolykey {}

class ErrorRepositoryUndefined extends ErrorGit {}

class ErrorCommit extends ErrorGit {}

class ErrorGitPermissionDenied extends ErrorGit {}

class ErrorGitUndefinedRefs extends ErrorGit {}

class ErrorGitUndefinedType extends ErrorGit {}

class ErrorGitReadObject extends ErrorGit {}

export {
  ErrorGit,
  ErrorRepositoryUndefined,
  ErrorCommit,
  ErrorGitPermissionDenied,
  ErrorGitUndefinedRefs,
  ErrorGitUndefinedType,
  ErrorGitReadObject,
};
