import { ErrorPolykey } from '../errors';

class ErrorNodes extends ErrorPolykey {}

class ErrorNodeManagerNotStarted extends ErrorNodes {}

class ErrorNodeGraphNotStarted extends ErrorNodes {}

// Cannot locate a node through getClosestGlobalNodes
class ErrorNodeGraphNodeNotFound extends ErrorNodes {}

class ErrorNodeGraphNodeIdMissing extends ErrorNodes {}

class ErrorNodeGraphSelfConnect extends ErrorNodes {}

class ErrorNodeGraphEmptyDatabase extends ErrorNodes {}

class ErrorNodeGraphInvalidBucketIndex extends ErrorNodes {}

class ErrorNodeConnectionNotStarted extends ErrorNodes {}

class ErrorNodeConnectionNotExist extends ErrorNodes {}

class ErrorNodeConnectionInfoNotExist extends ErrorNodes {}

class ErrorNodeConnectionPublicKeyNotFound extends ErrorNodes {}

class ErrorInvalidNodeId extends ErrorNodes {
  description: string = 'Invalid node ID.';
  exitCode: number = 64;
}

class ErrorInvalidHost extends ErrorNodes {
  description: string = 'Invalid IP address.';
  exitCode: number = 64;
}

export {
  ErrorNodes,
  ErrorNodeManagerNotStarted,
  ErrorNodeGraphNotStarted,
  ErrorNodeGraphNodeNotFound,
  ErrorNodeGraphNodeIdMissing,
  ErrorNodeGraphSelfConnect,
  ErrorNodeGraphEmptyDatabase,
  ErrorNodeGraphInvalidBucketIndex,
  ErrorNodeConnectionNotStarted,
  ErrorNodeConnectionNotExist,
  ErrorNodeConnectionInfoNotExist,
  ErrorNodeConnectionPublicKeyNotFound,
  ErrorInvalidNodeId,
  ErrorInvalidHost,
};
