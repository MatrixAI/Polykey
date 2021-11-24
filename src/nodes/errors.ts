import { ErrorPolykey } from '../errors';

class ErrorNodes extends ErrorPolykey {}

class ErrorNodeManagerRunning extends ErrorNodes {}

class ErrorNodeManagerNotRunning extends ErrorNodes {}

class ErrorNodeManagerDestroyed extends ErrorNodes {}

class ErrorNodeGraphRunning extends ErrorNodes {}

class ErrorNodeGraphNotRunning extends ErrorNodes {}

class ErrorNodeGraphDestroyed extends ErrorNodes {}

// Cannot locate a node through getClosestGlobalNodes

class ErrorNodeGraphNodeNotFound extends ErrorNodes {}

class ErrorNodeGraphNodeIdMissing extends ErrorNodes {}

class ErrorNodeGraphSelfConnect extends ErrorNodes {}

class ErrorNodeGraphEmptyDatabase extends ErrorNodes {}

class ErrorNodeGraphInvalidBucketIndex extends ErrorNodes {}

class ErrorNodeConnectionRunning extends ErrorNodes {}

class ErrorNodeConnectionNotRunning extends ErrorNodes {}

class ErrorNodeConnectionDestroyed extends ErrorNodes {}

class ErrorNodeConnectionTimeout extends ErrorNodes {
  description: 'A node connection could not be established (timed out)';
}

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
  ErrorNodeManagerRunning,
  ErrorNodeManagerNotRunning,
  ErrorNodeManagerDestroyed,
  ErrorNodeGraphRunning,
  ErrorNodeGraphNotRunning,
  ErrorNodeGraphDestroyed,
  ErrorNodeGraphNodeNotFound,
  ErrorNodeGraphNodeIdMissing,
  ErrorNodeGraphSelfConnect,
  ErrorNodeGraphEmptyDatabase,
  ErrorNodeGraphInvalidBucketIndex,
  ErrorNodeConnectionRunning,
  ErrorNodeConnectionNotRunning,
  ErrorNodeConnectionDestroyed,
  ErrorNodeConnectionTimeout,
  ErrorNodeConnectionNotExist,
  ErrorNodeConnectionInfoNotExist,
  ErrorNodeConnectionPublicKeyNotFound,
  ErrorInvalidNodeId,
  ErrorInvalidHost,
};
