import type { SessionToken } from '../../sessions/types';
import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandUnlock extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('unlock');
    this.description('Request a New Token and Start a New Session');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const sessionsPB = await import(
        '../../proto/js/polykey/v1/sessions/sessions_pb'
      );

      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );

      let pkClient: PolykeyClient | undefined;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
      });
      try {
        pkClient = await PolykeyClient.createPolykeyClient({
          nodePath: options.nodePath,
          nodeId: clientOptions.nodeId,
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          logger: this.logger.getChild(PolykeyClient.name),
        });

        const password = await binProcessors.processPassword(
          options.passwordFile,
          this.fs,
        );
        const grpcClient = pkClient.grpcClient;
        const passwordMessage = new sessionsPB.Password();
        passwordMessage.setPassword(password);
        const responseMessage = await binUtils.retryAuthentication(
          (metaRetried?: Metadata) => {
            return metaRetried != null
              ? grpcClient.sessionsUnlock(passwordMessage, metaRetried)
              : grpcClient.sessionsUnlock(passwordMessage);
          },
        );
        const token: SessionToken = responseMessage.getToken() as SessionToken;

        // Write token to file
        await pkClient.session.writeToken(token);
        process.stdout.write('Client session started');
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandUnlock;
