import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorCLI extends ErrorPolykey {}

class ErrorCLINodePath extends ErrorCLI {
  description = 'Cannot derive default node path from unknown platform';
  exitCode = sysexits.USAGE;
}

class ErrorCLIClientOptions extends ErrorCLI {
  description =
    'Missing required client options';
  exitCode = sysexits.USAGE;
}

class ErrorCLIPasswordMissing extends ErrorCLI {
  description =
    'Password is necessary, provide it via --password-file, PK_PASSWORD or when prompted';
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

class ErrorCLIPolykeyAgentStatus extends ErrorCLI {
  description = 'PolykeyAgent agent status';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorCLIPolykeyAgentProcess extends ErrorCLI {
  description = 'PolykeyAgent process could not be started';
  exitCode = sysexits.OSERR;
}

class ErrorNodeFindFailed extends ErrorCLI {
  description = 'Failed to find the node in the DHT';
  exitCode = 1;
}

class ErrorNodePingFailed extends ErrorCLI {
  description = 'Node was not online or not found.';
  exitCode = 1;
}

export {
  ErrorCLI,
  ErrorCLINodePath,
  ErrorCLIClientOptions,
  ErrorCLIPasswordMissing,
  ErrorCLIPasswordFileRead,
  ErrorCLIRecoveryCodeFileRead,
  ErrorCLIFileRead,
  ErrorCLIPolykeyAgentStatus,
  ErrorCLIPolykeyAgentProcess,
  ErrorNodeFindFailed,
  ErrorNodePingFailed,
};
