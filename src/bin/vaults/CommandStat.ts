// Import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
// import PolykeyClient from '../../PolykeyClient';
// import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
// import * as utils from '../../utils';
// import * as binUtils from '../utils';

// import * as grpcErrors from '../../grpc/errors';

// import CommandPolykey from '../CommandPolykey';
// import * as binOptions from '../utils/options';

// class CommandStat extends CommandPolykey {
//   constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
//     super(...args);
//     this.name('stat');
//     this.description('Vaults Stat');
//     this.requiredOption(
//       '-vn, --vault-name <vaultName>',
//       '(required) Name of the vault to get stats from',
//     );
//     this.addOption(binOptions.nodeId);
//     this.addOption(binOptions.clientHost);
//     this.addOption(binOptions.clientPort);
//     this.action(async (options) => {

//     });
//   }
// }

// export default CommandStat;

// OLD COMMAND
// const stat = binUtils.createCommand('stat', {
//   description: 'Gets stats of an existing vault',
//   nodePath: true,
//   verbose: true,
//   format: true,
// });
// stat.requiredOption(
//   '-vn, --vault-name <vaultName>',
//   '(required) Name of the vault to get stats from',
// );
// stat.action(async (options) => {
//   const clientConfig = {};
//   clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
//     new StreamHandler(),
//   ]);
//   if (options.verbose) {
//     clientConfig['logger'].setLevel(LogLevel.DEBUG);
//   }
//   clientConfig['nodePath'] = options.nodePath
//     ? options.nodePath
//     : utils.getDefaultNodePath();

//   const client = await PolykeyClient.createPolykeyClient(clientConfig);
//   const vaultMessage = new vaultsPB.Vault();
//   vaultMessage.setNameOrId(options.vaultName);

//   try {
//     await client.start({});
//     const grpcClient = client.grpcClient;
//     const responseMessage = await binUtils.unaryCallCARL<vaultsPB.Stat>(
//       client,
//       attemptUnaryCall(client, grpcClient.vaultsSecretsStat),
//     )(vaultMessage);

//     process.stdout.write(
//       binUtils.outputFormatter({
//         type: options.format === 'json' ? 'json' : 'list',
//         data: [
//           `${vaultMessage.getNameOrId()}:\t\t${responseMessage.getStats()}`,
//         ],
//       }),
//     );
//   } catch (err) {
//     if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
//       process.stderr.write(`${err.message}\n`);
//     } else if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
//       process.stderr.write(`${err.message}\n`);
//     } else {
//       process.stderr.write(
//         binUtils.outputFormatter({
//           type: 'error',
//           description: err.description,
//           message: err.message,
//         }),
//       );
//       throw err;
//     }
//   } finally {
//     await client.stop();
//     options.nodePath = undefined;
//     options.verbose = undefined;
//     options.format = undefined;
//   }
// });

// export default stat;
