import { ErrorPolykey, sysexits } from '../errors';

class ErrorClient<T> extends ErrorPolykey<T> {}

class ErrorClientClient<T> extends ErrorClient<T> {}

class ErrorClientDestroyed<T> extends ErrorClientClient<T>{
  static description = 'ClientClient has been destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorClientInvalidHost<T> extends ErrorClientClient<T>{
  static description = 'Host must be a valid IPv4 or IPv6 address string';
  exitCode = sysexits.USAGE;
}

class ErrorClientConnectionFailed<T> extends ErrorClientClient<T>{
  static description = 'Failed to establish connection to server';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorClientConnectionTimedOut<T> extends ErrorClientClient<T>{
  static description = 'Connection timed out';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorClientConnectionEndedEarly<T> extends ErrorClientClient<T>{
  static description = 'Connection ended before stream ended';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorClientServer<T> extends ErrorClient<T> {}

class ErrorServerPortUnavailable<T> extends ErrorClientServer<T>{
  static description = 'Failed to bind a free port';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorServerSendFailed<T> extends ErrorClientServer<T>{
  static description = 'Failed to send message';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorServerReadableBufferLimit<T> extends ErrorClientServer<T>{
  static description = 'Readable buffer is full, messages received too quickly';
  exitCode = sysexits.USAGE;
}

class ErrorServerConnectionEndedEarly<T> extends ErrorClientServer<T>{
  static description = 'Connection ended before stream ended';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorClientClient,
  ErrorClientDestroyed,
  ErrorClientInvalidHost,
  ErrorClientConnectionFailed,
  ErrorClientConnectionTimedOut,
  ErrorClientConnectionEndedEarly,
  ErrorClientServer,
  ErrorServerPortUnavailable,
  ErrorServerSendFailed,
  ErrorServerReadableBufferLimit,
  ErrorServerConnectionEndedEarly,
}
