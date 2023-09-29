import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

// TODO: Some errors may need to be removed here, TBD in stage 2 agent migration

class ErrorNodes<T> extends ErrorPolykey<T> {}

class ErrorNodeAborted<T> extends ErrorNodes<T> {
  static description = 'Operation was aborted';
  exitCode = sysexits.USAGE;
}

class ErrorNodeManagerNotRunning<T> extends ErrorNodes<T> {
  static description = 'NodeManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorQueueNotRunning<T> extends ErrorNodes<T> {
  static description = 'queue is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphRunning<T> extends ErrorNodes<T> {
  static description = 'NodeGraph is running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphNotRunning<T> extends ErrorNodes<T> {
  static description = 'NodeGraph is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphDestroyed<T> extends ErrorNodes<T> {
  static description = 'NodeGraph is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphNodeIdNotFound<T> extends ErrorNodes<T> {
  static description = 'Could not find NodeId';
  exitCode = sysexits.NOUSER;
}

class ErrorNodeGraphOversizedBucket<T> extends ErrorNodes<T> {
  static description: 'Bucket invalidly contains more nodes than capacity';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphSameNodeId<T> extends ErrorNodes<T> {
  static description: 'NodeId must be different for valid bucket calculation';
  exitCode = sysexits.USAGE;
}

class ErrorNodeGraphBucketIndex<T> extends ErrorNodes<T> {
  static description: 'Bucket index is out of range';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionDestroyed<T> extends ErrorNodes<T> {
  static description = 'NodeConnection is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionTimeout<T> extends ErrorNodes<T> {
  static description: 'A node connection could not be established (timed out)';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionMultiConnectionFailed<T> extends ErrorNodes<T> {
  static description: 'Could not establish connection when multiple resolved hosts were involved';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionManagerNotRunning<T> extends ErrorNodes<T> {
  static description = 'NodeConnectionManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionHostWildcard<T> extends ErrorNodes<T> {
  static description = 'An IP wildcard was provided for the target host';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionSameNodeId<T> extends ErrorNodes<T> {
  static description =
    'Provided NodeId is the same as this agent, attempts to connect is improper usage';
  exitCode = sysexits.USAGE;
}
class ErrorNodeConnectionConnectionError<T> extends ErrorNodes<T> {
  static description =
    'There was a failure with the underlying QUICConnection';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionClientError<T> extends ErrorNodes<T> {
  static description =
    'There was a failure with the underlying QUICCLient';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionTransportUnknownError<T> extends ErrorNodes<T> {
  static description =
    'Transport received an unknown error';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionTransportGenericError<T> extends ErrorNodes<T> {
  static description =
    'Transport received a generic error';
  exitCode = sysexits.USAGE;
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
  ErrorNodeAborted,
  ErrorNodeManagerNotRunning,
  ErrorQueueNotRunning,
  ErrorNodeGraphRunning,
  ErrorNodeGraphNotRunning,
  ErrorNodeGraphDestroyed,
  ErrorNodeGraphNodeIdNotFound,
  ErrorNodeGraphOversizedBucket,
  ErrorNodeGraphSameNodeId,
  ErrorNodeGraphBucketIndex,
  ErrorNodeConnectionDestroyed,
  ErrorNodeConnectionTimeout,
  ErrorNodeConnectionMultiConnectionFailed,
  ErrorNodeConnectionManagerNotRunning,
  ErrorNodeConnectionHostWildcard,
  ErrorNodeConnectionSameNodeId,
  ErrorNodeConnectionConnectionError,
  ErrorNodeConnectionClientError,
  ErrorNodeConnectionTransportUnknownError,
  ErrorNodeConnectionTransportGenericError,
  ErrorNodePingFailed,
  ErrorNodePermissionDenied,
};
