import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import IdentitiesManager from '@/identities/IdentitiesManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import identitiesAuthenticate from '@/client/service/identitiesAuthenticate';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as validationErrors from '@/validation/errors';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import TestProvider from '../../identities/TestProvider';

describe('identitiesAuthenticate', () => {
  const logger = new Logger('identitiesAuthenticate test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  let dataDir: string;
  let testProvider: TestProvider;
  let identitiesManager: IdentitiesManager;
  let db: DB;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger,
    });
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    const clientService = {
      identitiesAuthenticate: identitiesAuthenticate({
        authenticate,
        identitiesManager,
        logger,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: nodesUtils.decodeNodeId(
        'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
      )!,
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await identitiesManager.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('authenticates identity', async () => {
    const request = new identitiesPB.Provider();
    request.setProviderId(testToken.providerId);
    const response = grpcClient.identitiesAuthenticate(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    let step = 0;
    for await (const message of response) {
      if (step === 0) {
        expect(message.getStepCase()).toBe(
          identitiesPB.AuthenticationProcess.StepCase.REQUEST,
        );
        const authRequest = message.getRequest()!;
        expect(authRequest.getUrl()).toBe('test.com');
        expect(authRequest.getDataMap().get('userCode')).toBe('randomtestcode');
      }
      if (step === 1) {
        expect(message.getStepCase()).toBe(
          identitiesPB.AuthenticationProcess.StepCase.RESPONSE,
        );
        const authResponse = message.getResponse()!;
        expect(authResponse.getIdentityId()).toBe(testToken.identityId);
      }
      step++;
    }
    expect(
      await identitiesManager.getToken(
        testToken.providerId,
        testToken.identityId,
      ),
    ).toEqual(testToken.tokenData);
    expect(response.stream.destroyed).toBeTruthy();
    await identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
  });
  test('cannot authenticate invalid provider', async () => {
    const request = new identitiesPB.Provider();
    request.setProviderId('');
    await expect(
      grpcClient
        .identitiesAuthenticate(
          request,
          clientUtils.encodeAuthFromPassword(password),
        )
        .next(),
    ).rejects.toThrow(validationErrors.ErrorValidation);
  });
});
