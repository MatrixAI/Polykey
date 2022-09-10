import type { Interceptor } from '@grpc/grpc-js';
import type Session from '@/sessions/Session';
import type { NodeId } from '@/nodes/types';
import type { Host, Port, TLSConfig, ProxyConfig } from '@/network/types';
import type * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import type { ClientReadableStream } from '@grpc/grpc-js/build/src/call';
import type { AsyncGeneratorReadableStreamClient } from '@/grpc/types';
import type { Timer } from '@/types';
import Logger from '@matrixai/logger';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import GRPCClient from '@/grpc/GRPCClient';
import * as grpcUtils from '@/grpc/utils';
import * as clientUtils from '@/client/utils';
import { TestServiceClient } from '@/proto/js/polykey/v1/test_service_grpc_pb';

interface GRPCClientTest extends CreateDestroy {}
@CreateDestroy()
class GRPCClientTest extends GRPCClient<TestServiceClient> {
  public static async createGRPCClientTest({
    nodeId,
    host,
    port,
    tlsConfig,
    proxyConfig,
    session,
    timer,
    destroyCallback,
    logger = new Logger(this.name),
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    tlsConfig?: TLSConfig;
    proxyConfig?: ProxyConfig;
    session?: Session;
    timer?: Timer;
    destroyCallback?: () => Promise<void>;
    logger?: Logger;
  }): Promise<GRPCClientTest> {
    logger.info(`Creating ${this.name}`);
    const interceptors: Array<Interceptor> = [];
    if (session != null) {
      interceptors.push(clientUtils.sessionInterceptor(session));
    }
    const { client, serverCertChain } = await super.createClient({
      clientConstructor: TestServiceClient,
      nodeId,
      host,
      port,
      tlsConfig,
      proxyConfig,
      timer,
      interceptors,
      logger,
    });
    const grpcClientTest = new GRPCClientTest({
      client,
      nodeId,
      host,
      port,
      tlsConfig,
      proxyConfig,
      serverCertChain,
      destroyCallback,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return grpcClientTest;
  }

  public async destroy() {
    await super.destroy();
  }

  @ready()
  public unary(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
        command: this.unary.name,
      },
      this.client.unary,
    )(...args);
  }

  @ready()
  public serverStream(...args) {
    return grpcUtils.promisifyReadableStreamCall<utilsPB.EchoMessage>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
        command: this.serverStream.name,
      },
      this.client.serverStream,
    )(...args);
  }

  @ready()
  public clientStream(...args) {
    return grpcUtils.promisifyWritableStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
        command: this.clientStream.name,
      },
      this.client.clientStream,
    )(...args);
  }

  @ready()
  public duplexStream(...args) {
    return grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
        command: this.duplexStream.name,
      },
      this.client.duplexStream,
    )(...args);
  }

  @ready()
  public unaryAuthenticated(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
        command: this.unaryAuthenticated.name,
      },
      this.client.unaryAuthenticated,
    )(...args);
  }

  @ready()
  public serverStreamFail(
    ...args
  ): AsyncGeneratorReadableStreamClient<
    utilsPB.EchoMessage,
    ClientReadableStream<utilsPB.EchoMessage>
  > {
    return grpcUtils.promisifyReadableStreamCall<utilsPB.EchoMessage>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
        command: this.serverStreamFail.name,
      },
      this.client.serverStreamFail,
    )(...args);
  }

  @ready()
  public unaryFail(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
        command: this.unaryFail.name,
      },
      this.client.unaryFail,
    )(...args);
  }
}

export default GRPCClientTest;
