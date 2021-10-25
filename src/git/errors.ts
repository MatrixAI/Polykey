import { ErrorPolykey } from '../errors';

class ErrorGit extends ErrorPolykey {}

class ErrorRepositoryUndefined extends ErrorGit {}

class ErrorGitPermissionDenied extends ErrorGit {}

class ErrorGitUndefinedRefs extends ErrorGit {}

class ErrorGitUndefinedType extends ErrorGit {}

class ErrorGitReadObject extends ErrorGit {}

class ErrorGitUnimplementedMethod extends ErrorGit {}

export {
  ErrorGit,
  ErrorRepositoryUndefined,
  ErrorGitPermissionDenied,
  ErrorGitUndefinedRefs,
  ErrorGitUndefinedType,
  ErrorGitReadObject,
  ErrorGitUnimplementedMethod,
};
