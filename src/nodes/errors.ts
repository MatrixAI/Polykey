import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorNodes<T> extends ErrorPolykey<T> {}

class ErrorNodeManager<T> extends ErrorNodes<T> {}

class ErrorNodeManagerNotRunning<T> extends ErrorNodeManager<T> {
  static description = 'NodeManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeManagerNodeIdOwn<T> extends ErrorNodeManager<T> {
  static description = 'NodeId is the same as the current node';
  exitCode = sysexits.USAGE;
}

class ErrorNodeManagerConnectionFailed<T> extends ErrorNodeManager<T> {
  static description = 'Failed to find or establish a connection';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorNodeManagerFindNodeFailed<T> extends ErrorNodeManager<T> {
  static description = 'Failed to find node';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorNodeManagerResolveNodeFailed<T> extends ErrorNodeManager<T> {
  static description = 'Failed to resolve node address using DNS';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorNodeManagerSyncNodeGraphFailed<T> extends ErrorNodeManager<T> {
  static description = 'Failed to enter the network with syncNodeGraph';
  exitCode = sysexits.TEMPFAIL;
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

class ErrorNodeGraphBucketLimit<T> extends ErrorNodeGraph<T> {
  static description: 'Node graph bucket limit reached';
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

class ErrorNodeConnectionMultiConnectionFailed<
  T,
> extends ErrorNodeConnection<T> {
  static description: 'Could not establish connection when multiple resolved hosts were involved';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionHostWildcard<T> extends ErrorNodeConnection<T> {
  static description = 'An IP wildcard was provided for the target host';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionHostLinkLocal<T> extends ErrorNodeConnection<T> {
  static description =
    'A link-local IPv6 address was provided for the target host, attempts to connect will fail due to being unsupported';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionSameNodeId<T> extends ErrorNodeConnection<T> {
  static description =
    'Provided NodeId is the same as this agent, attempts to connect is improper usage';
  exitCode = sysexits.USAGE;
}
class ErrorNodeConnectionInternalError<T> extends ErrorNodeConnection<T> {
  static description = 'There was an internal failure with the NodeConnection';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionTransportUnknownError<
  T,
> extends ErrorNodeConnection<T> {
  static description = 'Transport received an unknown error';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionTransportGenericError<
  T,
> extends ErrorNodeConnection<T> {
  static description = 'Transport received a generic error';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionNodesEmpty<T> extends ErrorNodeConnection<T> {
  static description = 'Nodes list to verify against was empty';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionManager<T> extends ErrorNodes<T> {}

class ErrorNodeConnectionManagerNotRunning<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description = 'NodeConnectionManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionManagerStopping<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description = 'NodeConnectionManager is stopping';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionManagerInternalError<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description =
    'There was an internal failure with NodeConnectionManager';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodeConnectionManagerNodeIdRequired<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description =
    'No NodeId was provided for establishing a multi connection';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionManagerNodeAddressRequired<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description =
    'No NodeAddress was provided for establishing a multi connection';
  exitCode = sysexits.USAGE;
}

class ErrorNodeConnectionManagerMultiConnectionFailed<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description =
    'Failed to establish any connection during multi connection establishment';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorNodeConnectionManagerConnectionNotFound<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description = 'No existing connection was found for target NodeId';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorNodeConnectionManagerRequestRateExceeded<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description = 'Rate limit exceeded while making request';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorNodeConnectionManagerSignalFailed<
  T,
> extends ErrorNodeConnectionManager<T> {
  static description = 'Failed to signal hole punching';
  exitCode = sysexits.TEMPFAIL;
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

class ErrorNodeLookupNotFound<T> extends ErrorNodes<T> {
  static description = 'No seednodes were found for the given cluster hostname';
  exitCode = sysexits.NOHOST;
}

export {
  ErrorNodes,
  ErrorNodeManager,
  ErrorNodeManagerNotRunning,
  ErrorNodeManagerNodeIdOwn,
  ErrorNodeManagerConnectionFailed,
  ErrorNodeManagerFindNodeFailed,
  ErrorNodeManagerResolveNodeFailed,
  ErrorNodeManagerSyncNodeGraphFailed,
  ErrorNodeGraph,
  ErrorNodeGraphRunning,
  ErrorNodeGraphNotRunning,
  ErrorNodeGraphDestroyed,
  ErrorNodeGraphNodeIdNotFound,
  ErrorNodeGraphBucketLimit,
  ErrorNodeGraphSameNodeId,
  ErrorNodeGraphBucketIndex,
  ErrorNodeConnection,
  ErrorNodeConnectionDestroyed,
  ErrorNodeConnectionTimeout,
  ErrorNodeConnectionMultiConnectionFailed,
  ErrorNodeConnectionHostWildcard,
  ErrorNodeConnectionSameNodeId,
  ErrorNodeConnectionHostLinkLocal,
  ErrorNodeConnectionInternalError,
  ErrorNodeConnectionTransportUnknownError,
  ErrorNodeConnectionTransportGenericError,
  ErrorConnectionNodesEmpty,
  ErrorNodeConnectionManager,
  ErrorNodeConnectionManagerNotRunning,
  ErrorNodeConnectionManagerStopping,
  ErrorNodeConnectionManagerInternalError,
  ErrorNodeConnectionManagerNodeIdRequired,
  ErrorNodeConnectionManagerNodeAddressRequired,
  ErrorNodeConnectionManagerMultiConnectionFailed,
  ErrorNodeConnectionManagerConnectionNotFound,
  ErrorNodeConnectionManagerRequestRateExceeded,
  ErrorNodeConnectionManagerSignalFailed,
  ErrorNodePingFailed,
  ErrorNodePermissionDenied,
  ErrorNodeLookupNotFound,
};
