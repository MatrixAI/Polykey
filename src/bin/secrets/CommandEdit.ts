import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '../../PolykeyClient';
import * as binErrors from '../errors';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandEdit extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('edit');
    this.description('Edit a Secret');
    this.argument(
      '<secretPath>',
      'Path to the secret to be edited, specified as <vaultName>:<directoryPath>',
      parsers.parseSecretPath,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (secretPath, options) => {
      const os = await import('os');
      const { execSync } = await import('child_process');
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
      );
      const secretsPB = await import(
        '../../proto/js/polykey/v1/secrets/secrets_pb'
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

        const meta = await binProcessors.processAuthentication(
          options.passwordFile,
          this.fs,
        );

        const grpcClient = pkClient.grpcClient;
        const secretMessage = new secretsPB.Secret();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(secretPath[0]);
        secretMessage.setVault(vaultMessage);
        secretMessage.setSecretName(secretPath[1]);

        const response = await binUtils.retryAuthentication(
          (auth?: Metadata) => grpcClient.vaultsSecretsGet(secretMessage, auth),
          meta,
        );

        const secretContent = response.getSecretName();

        // Linux
        const tmpDir = `${os.tmpdir}/pksecret`;
        await this.fs.promises.mkdir(tmpDir);
        const tmpFile = `${tmpDir}/pkSecretFile`;

        await this.fs.promises.writeFile(tmpFile, secretContent);

        execSync(`$EDITOR \"${tmpFile}\"`, { stdio: 'inherit' });

        let content: Buffer;
        try {
          content = await this.fs.promises.readFile(tmpFile);
        } catch (e) {
          throw new binErrors.ErrorCLIFileRead(e.message, {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          });
        }

        secretMessage.setVault(vaultMessage);
        secretMessage.setSecretContent(content);
        await grpcClient.vaultsSecretsEdit(secretMessage);

        await this.fs.promises.rmdir(tmpDir, { recursive: true });

        // Windows
        // TODO: complete windows impl

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Edited secret: ${vaultMessage.getNameOrId()} in vault: ${vaultMessage.getNameOrId()}`,
            ],
          }),
        );
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandEdit;
