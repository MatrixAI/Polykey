import { ErrorPolykey } from '../errors';

class ErrorNodes extends ErrorPolykey {}

class ErrorNodeManagerNotStarted extends ErrorNodes {}

class ErrorNodeGraphNotStarted extends ErrorNodes {}

// Cannot locate a node through getClosestGlobalNodes
class ErrorNodeGraphNodeNotFound extends ErrorNodes {}

class ErrorNodeGraphNodeIdMissing extends ErrorNodes {}

class ErrorNodeGraphSelfConnect extends ErrorNodes {}

class ErrorNodeGraphEmptyShortlist extends ErrorNodes {}

class ErrorNodeGraphInvalidBucketIndex extends ErrorNodes {}

class ErrorNodeConnectionNotStarted extends ErrorNodes {}

class ErrorNodeConnectionNotExist extends ErrorNodes {}

class ErrorNodeConnectionInfoNotExist extends ErrorNodes {}

class ErrorNodeConnectionPublicKeyNotFound extends ErrorNodes {}

export {
  ErrorNodes,
  ErrorNodeManagerNotStarted,
  ErrorNodeGraphNotStarted,
  ErrorNodeGraphNodeNotFound,
  ErrorNodeGraphNodeIdMissing,
  ErrorNodeGraphSelfConnect,
  ErrorNodeGraphEmptyShortlist,
  ErrorNodeGraphInvalidBucketIndex,
  ErrorNodeConnectionNotStarted,
  ErrorNodeConnectionNotExist,
  ErrorNodeConnectionInfoNotExist,
  ErrorNodeConnectionPublicKeyNotFound,
};
