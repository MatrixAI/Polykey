import { ErrorPolykey, sysexits } from '../errors';

class ErrorNodes extends ErrorPolykey {}

class ErrorNodeGraphRunning extends ErrorNodes {
  description = 'NodeGraph is running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphNotRunning extends ErrorNodes {
  description = 'NodeGraph is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphDestroyed extends ErrorNodes {
  description = 'NodeGraph is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphNodeIdNotFound extends ErrorNodes {
  description = 'Could not find NodeId';
  exitCode = sysexits.NOUSER;
}

class ErrorNodeGraphEmptyDatabase extends ErrorNodes {
  description = 'NodeGraph database was empty';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphOversizedBucket extends ErrorNodes {
  description: 'Bucket invalidly contains more nodes than capacity';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphSameNodeId extends ErrorNodes {
  description: 'NodeId must be different for valid bucket calculation';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphBucketIndex extends ErrorNodes {
  description: 'Bucket index is out of range';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionDestroyed extends ErrorNodes {
  description = 'NodeConnection is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionTimeout extends ErrorNodes {
  description: 'A node connection could not be established (timed out)';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionInfoNotExist extends ErrorNodes {
  description: 'NodeConnection info was not found';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionPublicKeyNotFound extends ErrorNodes {
  description: 'Public key was not found';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionManagerNotRunning extends ErrorNodes {
  description = 'NodeConnectionManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionHostWildcard extends ErrorNodes {
  description = 'An IP wildcard was provided for the target host';
  exitCode = sysexits.USAGE;
}

export {
  ErrorNodes,
  ErrorNodeGraphRunning,
  ErrorNodeGraphNotRunning,
  ErrorNodeGraphDestroyed,
  ErrorNodeGraphNodeIdNotFound,
  ErrorNodeGraphEmptyDatabase,
  ErrorNodeGraphOversizedBucket,
  ErrorNodeGraphSameNodeId,
  ErrorNodeGraphBucketIndex,
  ErrorNodeConnectionDestroyed,
  ErrorNodeConnectionTimeout,
  ErrorNodeConnectionInfoNotExist,
  ErrorNodeConnectionPublicKeyNotFound,
  ErrorNodeConnectionManagerNotRunning,
  ErrorNodeConnectionHostWildcard,
};
