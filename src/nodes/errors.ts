import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

// TODO: Some errors may need to be removed here, TBD in stage 2 agent migration

class ErrorNodes<T> extends ErrorPolykey<T> {}

class ErrorNodeManager<T> extends ErrorNodes<T> {}

class ErrorNodeManagerNotRunning<T> extends ErrorNodeManager<T> {
  static description = 'NodeManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraph<T> extends ErrorNodes<T> {}

class ErrorNodeGraphRunning<T> extends ErrorNodeGraph<T> {
  static description = 'NodeGraph is running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphNotRunning<T> extends ErrorNodeGraph<T> {
  static description = 'NodeGraph is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphDestroyed<T> extends ErrorNodeGraph<T> {
  static description = 'NodeGraph is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphNodeIdNotFound<T> extends ErrorNodeGraph<T> {
  static description = 'Could not find NodeId';
  exitCode = sysexits.NOUSER;
}

class ErrorNodeGraphOversizedBucket<T> extends ErrorNodeGraph<T> {
  static description: 'Bucket invalidly contains more nodes than capacity';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphSameNodeId<T> extends ErrorNodeGraph<T> {
  static description: 'NodeId must be different for valid bucket calculation';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphBucketIndex<T> extends ErrorNodeGraph<T> {
  static description: 'Bucket index is out of range';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnection<T> extends ErrorNodes<T> {}

class ErrorNodeConnectionDestroyed<T> extends ErrorNodeConnection<T> {
  static description = 'NodeConnection is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionTimeout<T> extends ErrorNodeConnection<T> {
  static description: 'A node connection could not be established (timed out)';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionMultiConnectionFailed<T> extends ErrorNodeConnection<T> {
  static description: 'Could not establish connection when multiple resolved hosts were involved';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionHostWildcard<T> extends ErrorNodeConnection<T> {
  static description = 'An IP wildcard was provided for the target host';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionSameNodeId<T> extends ErrorNodeConnection<T> {
  static description =
    'Provided NodeId is the same as this agent, attempts to connect is improper usage';
  exitCode = sysexits.USAGE;
}
class ErrorNodeConnectionInternalError<T> extends ErrorNodeConnection<T> {
  static description =
    'There was an internal failure with the NodeConnection';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionTransportUnknownError<T> extends ErrorNodeConnection<T> {
  static description =
    'Transport received an unknown error';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionTransportGenericError<T> extends ErrorNodeConnection<T> {
  static description =
    'Transport received a generic error';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionManager<T> extends ErrorNodes<T> {}

class ErrorNodeConnectionManagerNotRunning<T> extends ErrorNodeConnectionManager<T> {
  static description = 'NodeConnectionManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionManagerInternalError<T> extends ErrorNodeConnectionManager<T> {
  static description = 'There was an internal failure with NodeConnectionManager';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodePingFailed<T> extends ErrorNodes<T> {
  static description =
    'Failed to ping the node when attempting to authenticate';
  exitCode = sysexits.NOHOST;
}

class ErrorNodePermissionDenied<T> extends ErrorNodes<T> {
  static description = 'Permission not given to do this action';
  exitCode = sysexits.NOHOST;
}

export {
  ErrorNodes,
  ErrorNodeManager,
  ErrorNodeManagerNotRunning,
  ErrorNodeGraph,
  ErrorNodeGraphRunning,
  ErrorNodeGraphNotRunning,
  ErrorNodeGraphDestroyed,
  ErrorNodeGraphNodeIdNotFound,
  ErrorNodeGraphOversizedBucket,
  ErrorNodeGraphSameNodeId,
  ErrorNodeGraphBucketIndex,
  ErrorNodeConnection,
  ErrorNodeConnectionDestroyed,
  ErrorNodeConnectionTimeout,
  ErrorNodeConnectionMultiConnectionFailed,
  ErrorNodeConnectionHostWildcard,
  ErrorNodeConnectionSameNodeId,
  ErrorNodeConnectionInternalError,
  ErrorNodeConnectionTransportUnknownError,
  ErrorNodeConnectionTransportGenericError,
  ErrorNodeConnectionManager,
  ErrorNodeConnectionManagerNotRunning,
  ErrorNodeConnectionManagerInternalError,
  ErrorNodePingFailed,
  ErrorNodePermissionDenied,
};
