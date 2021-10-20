import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as clientUtils } from '../../client';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const update = binUtils.createCommand('update', {
  description: 'Updates a secret within a given vault',
  nodePath: true,
  verbose: true,
  format: true,
});
update.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to update, specified as <vaultName>:<secretPath>',
);
update.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to the file containing the updated secret content',
);
update.action(async (options) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = await PolykeyClient.createPolykeyClient(clientConfig);
  const vaultMessage = new vaultsPB.Vault();
  const secretMessage = new secretsPB.Secret();
  secretMessage.setVault(vaultMessage);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const secretPath: string = options.secretPath;
    if (!binUtils.pathRegex.test(secretPath)) {
      throw new CLIErrors.ErrorSecretPathFormat();
    }
    const [, vaultName, secretName] = secretPath.match(binUtils.pathRegex)!;

    vaultMessage.setNameOrId(vaultName);
    secretMessage.setSecretName(secretName);

    const content = fs.readFileSync(options.filePath);

    secretMessage.setSecretContent(content);

    const pCall = grpcClient.vaultsSecretsEdit(secretMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    await pCall;
    await p;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Updated secret: ${secretMessage.getSecretName()} in vault: ${vaultMessage.getNameOrId()}`,
        ],
      }),
    );
  } catch (err) {
    if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          description: err.description,
          message: err.message,
        }),
      );
      throw err;
    }
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
    options.filePath = undefined;
  }
});

export default update;
