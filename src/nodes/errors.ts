import { ErrorPolykey } from '../errors';

class ErrorNodes extends ErrorPolykey {}

class ErrorNodeManagerNotStarted extends ErrorNodes {}

class ErrorNodeGraphKeyRead extends ErrorNodes {}

class ErrorNodeGraphKeyWrite extends ErrorNodes {}

class ErrorNodeGraphKeyParse extends ErrorNodes {}

class ErrorNodeGraphNotStarted extends ErrorNodes {}

class ErrorNodeGraphValueDecrypt extends ErrorNodes {}

class ErrorNodeGraphValueParse extends ErrorNodes {}

class ErrorNodeGraphSelfConnect extends ErrorNodes {}

class ErrorNodeGraphEmptyShortlist extends ErrorNodes {}

class ErrorNodeGraphInvalidBucketIndex extends ErrorNodes {}

class ErrorNodeConnectionNotStarted extends ErrorNodes {}

class ErrorNodeConnectionNotExist extends ErrorNodes {}

export {
  ErrorNodes,
  ErrorNodeManagerNotStarted,
  ErrorNodeGraphKeyRead,
  ErrorNodeGraphKeyWrite,
  ErrorNodeGraphKeyParse,
  ErrorNodeGraphNotStarted,
  ErrorNodeGraphValueDecrypt,
  ErrorNodeGraphValueParse,
  ErrorNodeGraphSelfConnect,
  ErrorNodeGraphEmptyShortlist,
  ErrorNodeGraphInvalidBucketIndex,
  ErrorNodeConnectionNotStarted,
  ErrorNodeConnectionNotExist,
};
