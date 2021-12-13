import type PolykeyClient from '../../PolykeyClient';
import path from 'path';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import config from '../../config';

class CommandLockAll extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('lockall');
    this.description('Lock all Clients and Clear the Existing Token');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const { default: Session } = await import('../../sessions/Session');
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');

      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      const session = new Session({
        sessionTokenPath: path.join(
          options.nodePath,
          config.defaults.tokenBase,
        ),
        fs: this.fs,
        logger: this.logger.getChild(Session.name),
      });
      let pkClient: PolykeyClient;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
      });
      try {
        pkClient = await PolykeyClient.createPolykeyClient({
          nodeId: clientOptions.nodeId,
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          nodePath: options.nodePath,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        const emptyMessage = new utilsPB.EmptyMessage();
        await binUtils.retryAuthentication(
          (auth) => pkClient.grpcClient.sessionsLockAll(emptyMessage, auth),
          meta,
        );
        // Destroy local session
        await session.destroy();
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandLockAll;
