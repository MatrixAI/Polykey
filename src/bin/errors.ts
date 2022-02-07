import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorCLI extends ErrorPolykey {}

class ErrorCLINodePath extends ErrorCLI {
  description = 'Cannot derive default node path from unknown platform';
  exitCode = sysexits.USAGE;
}

class ErrorCLIStatusMissing extends ErrorCLI {
  description =
    'Could not resolve nodeId, clientHost or clientPort from non-existent Status';
  exitCode = sysexits.USAGE;
}

class ErrorCLIStatusNotLive extends ErrorCLI {
  description =
    'Could not resolve nodeId, clientHost or clientPort from Status';
  exitCode = sysexits.USAGE;
}

class ErrorCLIStatusStarting extends ErrorCLI {
  description = 'Agent is starting';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorCLIPolykeyAgentProcess extends ErrorCLI {
  description = 'PolykeyAgent process could not be started';
  exitCode = sysexits.OSERR;
}

class ErrorCLIPasswordMissing extends ErrorCLI {
  description =
    'Password is necessary, provide it via PK_PASSWORD, --password-file or when prompted';
  exitCode = sysexits.USAGE;
}

class ErrorCLIPasswordFileRead extends ErrorCLI {
  description = 'Failed to read password file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIRecoveryCodeFileRead extends ErrorCLI {
  description = 'Failed to read recovery code file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIFileRead extends ErrorCLI {
  description = 'Failed to read file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLINodeFindFailed extends ErrorCLI {
  description = 'Failed to find the node in the DHT';
  exitCode = 1;
}

class ErrorCLINodePingFailed extends ErrorCLI {
  description = 'Node was not online or not found.';
  exitCode = 1;
}

export {
  ErrorCLI,
  ErrorCLINodePath,
  ErrorCLIPasswordMissing,
  ErrorCLIStatusMissing,
  ErrorCLIStatusStarting,
  ErrorCLIStatusNotLive,
  ErrorCLIPolykeyAgentProcess,
  ErrorCLIPasswordFileRead,
  ErrorCLIRecoveryCodeFileRead,
  ErrorCLIFileRead,
  ErrorCLINodeFindFailed,
  ErrorCLINodePingFailed,
};
