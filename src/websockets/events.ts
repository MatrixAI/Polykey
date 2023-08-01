import type WebSocketStream from './WebSocketStream';

class StartEvent extends Event {
  public detail: {
    host: string;
    port: number;
  };
  constructor(
    options: EventInit & {
      detail: {
        host: string;
        port: number;
      };
    },
  ) {
    super('start', options);
    this.detail = options.detail;
  }
}

class StopEvent extends Event {
  constructor(options?: EventInit) {
    super('stop', options);
  }
}

class ConnectionEvent extends Event {
  public detail: {
    webSocketStream: WebSocketStream;
  };
  constructor(
    options: EventInit & {
      detail: {
        webSocketStream: WebSocketStream;
      };
    },
  ) {
    super('connection', options);
    this.detail = options.detail;
  }
}

export { StartEvent, StopEvent, ConnectionEvent };
