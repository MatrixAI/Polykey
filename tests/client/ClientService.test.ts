import type { TLSConfig } from '@/network/types';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import ClientService from '@/client/ClientService';
import * as keysUtils from '@/keys/utils';
import * as testsUtils from '../utils';

describe(`ClientService tests`, () => {
  const logger = new Logger(`${ClientService.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1';
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  beforeEach(async () => {
    tlsConfig = await testsUtils.createTLSConfig(keysUtils.generateKeyPair());
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
  });
  test('ClientService readiness', async () => {
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {},
      host: localHost,
    });
    await clientService.stop({ force: true });
    // Should be a noop
    await clientService.stop({ force: true });
  });
});
