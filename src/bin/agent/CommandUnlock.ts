import type { SessionToken } from '../../sessions/types';
import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

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

      const client = await PolykeyClient.createPolykeyClient({
        logger: this.logger.getChild(PolykeyClient.name),
        nodePath: options.nodePath,
      });

      const password = await parsers.parsePassword({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        const passwordMessage = new sessionsPB.Password();
        passwordMessage.setPassword(password);
        const responseMessage = await binUtils.retryAuth(
          (metaRetried?: Metadata) => {
            return metaRetried != null
              ? grpcClient.sessionsUnlock(passwordMessage, metaRetried)
              : grpcClient.sessionsUnlock(passwordMessage);
          },
        );
        const token: SessionToken = responseMessage.getToken() as SessionToken;

        // Write token to file
        await client.session.writeToken(token);
        process.stdout.write('Client session started');
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandUnlock;
