import type { TLSSocket } from 'tls';
import type { ContextTimed } from '@matrixai/contexts';
import type { NodeId, NodeIdEncoded } from '../ids';
import { createDestroy } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import WebSocket from 'ws';
import { Validator } from 'ip-num';
import { Timer } from '@matrixai/timer';
import WebSocketStream from './WebSocketStream';
import * as webSocketUtils from './utils';
import * as webSocketErrors from './errors';
import { promise } from '../utils';
import * as nodesUtils from '../nodes/utils';

interface WebSocketClient extends createDestroy.CreateDestroy {}
@createDestroy.CreateDestroy()
class WebSocketClient {
  /**
   * @param obj
   * @param obj.host - Target host address to connect to
   * @param obj.port - Target port to connect to
   * @param obj.expectedNodeIds - Expected NodeIds you are trying to connect to. Will validate the cert chain of the
   * sever. If none of these NodeIDs are found the connection will be rejected.
   * @param obj.connectionTimeoutTime - Timeout time used when attempting the connection.
   * Default is Infinity milliseconds.
   * @param obj.pingIntervalTime - Time between pings for checking connection health and keep alive.
   * Default is 1,000 milliseconds.
   * @param obj.pingTimeoutTimeTime - Time before connection is cleaned up after no ping responses.
   * Default is 10,000 milliseconds.
   * @param obj.logger
   */
  static async createWebSocketClient({
    host,
    port,
    expectedNodeIds,
    connectionTimeoutTime = Infinity,
    pingIntervalTime = 1_000,
    pingTimeoutTimeTime = 10_000,
    logger = new Logger(this.name),
  }: {
    host: string;
    port: number;
    expectedNodeIds: Array<NodeId>;
    connectionTimeoutTime?: number;
    pingIntervalTime?: number;
    pingTimeoutTimeTime?: number;
    logger?: Logger;
  }): Promise<WebSocketClient> {
    logger.info(`Creating ${this.name}`);
    const clientClient = new this(
      logger,
      host,
      port,
      expectedNodeIds,
      connectionTimeoutTime,
      pingIntervalTime,
      pingTimeoutTimeTime,
    );
    logger.info(`Created ${this.name}`);
    return clientClient;
  }

  protected host: string;
  protected activeConnections: Set<WebSocketStream> = new Set();

  constructor(
    protected logger: Logger,
    host: string,
    protected port: number,
    protected expectedNodeIds: Array<NodeId>,
    protected connectionTimeoutTime: number,
    protected pingIntervalTime: number,
    protected pingTimeoutTimeTime: number,
  ) {
    if (Validator.isValidIPv4String(host)[0]) {
      this.host = host;
    } else if (Validator.isValidIPv6String(host)[0]) {
      this.host = `[${host}]`;
    } else {
      throw new webSocketErrors.ErrorClientInvalidHost();
    }
  }

  public async destroy(force: boolean = false) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    if (force) {
      for (const activeConnection of this.activeConnections) {
        activeConnection.cancel(
          new webSocketErrors.ErrorClientEndingConnections(
            'Destroying WebSocketClient',
          ),
        );
      }
    }
    for (const activeConnection of this.activeConnections) {
      // Ignore errors here, we only care that it finishes
      await activeConnection.endedProm.catch(() => {});
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @createDestroy.ready(new webSocketErrors.ErrorClientDestroyed())
  public async stopConnections() {
    for (const activeConnection of this.activeConnections) {
      activeConnection.cancel(
        new webSocketErrors.ErrorClientEndingConnections(),
      );
    }
    for (const activeConnection of this.activeConnections) {
      // Ignore errors here, we only care that it finished
      await activeConnection.endedProm.catch(() => {});
    }
  }

  @createDestroy.ready(new webSocketErrors.ErrorClientDestroyed())
  public async startConnection(
    ctx: Partial<ContextTimed> = {},
  ): Promise<WebSocketStream> {
    // Setting up abort/cancellation logic
    const abortRaceProm = promise<never>();
    // Ignore unhandled rejection
    abortRaceProm.p.catch(() => {});
    const timer =
      ctx.timer ??
      new Timer({
        delay: this.connectionTimeoutTime,
      });
    void timer.then(
      () => {
        abortRaceProm.rejectP(
          new webSocketErrors.ErrorClientConnectionTimedOut(),
        );
      },
      () => {}, // Ignore cancellation errors
    );
    const { signal } = ctx;
    let abortHandler: () => void | undefined;
    if (signal != null) {
      abortHandler = () => {
        abortRaceProm.rejectP(signal.reason);
      };
      if (signal.aborted) abortHandler();
      else signal.addEventListener('abort', abortHandler);
    }
    const cleanUp = () => {
      // Cancel timer if it was internally created
      if (ctx.timer == null) timer.cancel();
      signal?.removeEventListener('abort', abortHandler);
    };
    const address = `wss://${this.host}:${this.port}`;
    this.logger.info(`Connecting to ${address}`);
    const connectProm = promise<void>();
    const authenticateProm = promise<{
      nodeId: NodeIdEncoded;
      localHost: string;
      localPort: number;
      remoteHost: string;
      remotePort: number;
    }>();
    const ws = new WebSocket(address, {
      rejectUnauthorized: false,
    });
    // Handle connection failure
    const openErrorHandler = (e) => {
      connectProm.rejectP(
        new webSocketErrors.ErrorClientConnectionFailed(undefined, {
          cause: e,
        }),
      );
    };
    ws.once('error', openErrorHandler);
    // Authenticate server's certificates
    ws.once('upgrade', async (request) => {
      const tlsSocket = request.socket as TLSSocket;
      const peerCert = tlsSocket.getPeerCertificate(true);
      try {
        const nodeId = await webSocketUtils.verifyServerCertificateChain(
          this.expectedNodeIds,
          webSocketUtils.detailedToCertChain(peerCert),
        );
        authenticateProm.resolveP({
          nodeId: nodesUtils.encodeNodeId(nodeId),
          localHost: request.connection.localAddress ?? '',
          localPort: request.connection.localPort ?? 0,
          remoteHost: request.connection.remoteAddress ?? '',
          remotePort: request.connection.remotePort ?? 0,
        });
      } catch (e) {
        authenticateProm.rejectP(e);
      }
    });
    ws.once('open', () => {
      this.logger.info('starting connection');
      connectProm.resolveP();
    });
    const earlyCloseProm = promise();
    ws.once('close', () => {
      earlyCloseProm.resolveP();
    });
    // There are 3 resolve conditions here.
    //  1. Connection established and authenticated
    //  2. connection error or authentication failure
    //  3. connection timed out
    try {
      await Promise.race([
        abortRaceProm.p,
        await Promise.all([authenticateProm.p, connectProm.p]),
      ]);
    } catch (e) {
      // Clean up
      // unregister handlers
      ws.removeAllListeners('error');
      ws.removeAllListeners('upgrade');
      ws.removeAllListeners('open');
      // Close the ws if it's open at this stage
      ws.terminate();
      // Ensure the connection is removed from the active connection set before
      //  returning.
      await earlyCloseProm.p;
      throw e;
    } finally {
      cleanUp();
      // Cleaning up connection error
      ws.removeEventListener('error', openErrorHandler);
    }

    // Constructing the `ReadableWritablePair`, the lifecycle is handed off to
    //  the webSocketStream at this point.
    const webSocketStreamClient = new WebSocketStream(
      ws,
      this.pingIntervalTime,
      this.pingTimeoutTimeTime,
      {
        ...(await authenticateProm.p),
      },
      this.logger.getChild(WebSocketStream.name),
    );
    const abortStream = () => {
      webSocketStreamClient.cancel(
        new webSocketErrors.ErrorClientStreamAborted(undefined, {
          cause: signal?.reason,
        }),
      );
    };
    // Setting up activeStream map lifecycle
    this.activeConnections.add(webSocketStreamClient);
    void webSocketStreamClient.endedProm
      // Ignore errors, we only care that it finished
      .catch(() => {})
      .finally(() => {
        this.activeConnections.delete(webSocketStreamClient);
        signal?.removeEventListener('abort', abortStream);
      });
    // Abort connection on signal
    if (signal?.aborted === true) abortStream();
    else signal?.addEventListener('abort', abortStream);
    return webSocketStreamClient;
  }
}

// This is the internal implementation of the client's stream pair.
export default WebSocketClient;
