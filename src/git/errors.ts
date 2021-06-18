import { ErrorPolykey } from '../errors';

class ErrorGit extends ErrorPolykey {}

class ErrorRepositoryUndefined extends ErrorGit {}

class ErrorCommit extends ErrorGit {}

class ErrorGitPermissionDenied extends ErrorGit {}

export {
  ErrorGit,
  ErrorRepositoryUndefined,
  ErrorCommit,
  ErrorGitPermissionDenied,
};
