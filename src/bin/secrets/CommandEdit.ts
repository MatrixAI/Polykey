import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

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

      const client = await PolykeyClient.createPolykeyClient({
        nodePath: options.nodePath,
        logger: this.logger.getChild(PolykeyClient.name),
      });

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        const secretMessage = new secretsPB.Secret();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(secretPath[0]);
        secretMessage.setVault(vaultMessage);
        secretMessage.setSecretName(secretPath[1]);

        const response = await binUtils.retryAuth(
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

        const content = await this.fs.promises.readFile(tmpFile);

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
        await client.stop();
      }
    });
  }
}

export default CommandEdit;
