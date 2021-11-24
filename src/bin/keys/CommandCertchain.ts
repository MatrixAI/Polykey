import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandsCertchain extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('certchain');
    this.description('Get the Root Certificate Chain');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');

      const client = await PolykeyClient.createPolykeyClient({
        logger: this.logger.getChild(PolykeyClient.name),
        nodePath: options.nodePath,
      });

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        const emptyMessage = new utilsPB.EmptyMessage();
        const data = await binUtils.retryAuth(async (meta: Metadata) => {
          const data: Array<string> = [];
          const stream = grpcClient.keysCertsChainGet(emptyMessage, meta);
          for await (const cert of stream) {
            data.push(`Certificate:\t\t${cert.getCert()}`);
          }
          return data;
        }, meta);

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: data,
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandsCertchain;
