// Import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
// import PolykeyClient from '../../PolykeyClient';
// import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
// import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
// import * as utils from '../../utils';
// import * as binUtils from '../utils';
// import * as grpcErrors from '../../grpc/errors';

// import CommandPolykey from '../CommandPolykey';
// import * as binOptions from '../options';

// class CommandScan extends CommandPolykey {
//   constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
//     super(...args);
//     this.name('scan');
//     this.description('Vaults Scan');
//     this.requiredOption(
//       '-ni, --node-id <nodeId>',
//       '(required) Id of the node to be scanned',
//     );
//     this.addOption(binOptions.nodeId);
//     this.addOption(binOptions.clientHost);
//     this.addOption(binOptions.clientPort);
//     this.action(async (options) => {

//     });
//   }
// }

// export default CommandScan;

// OLD COMMAND
// const commandScanVaults = binUtils.createCommand('scan', {
//   description: 'Lists the vaults of another node',
//   aliases: ['fetch'],
//   nodePath: true,
//   verbose: true,
//   format: true,
// });
// commandScanVaults.requiredOption(
//   '-ni, --node-id <nodeId>',
//   '(required) Id of the node to be scanned',
// );
// commandScanVaults.action(async (options) => {
//   const clientConfig = {};
//   clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
//     new StreamHandler(),
//   ]);
//   if (options.verbose) {
//     clientConfig['logger'].setLevel(LogLevel.DEBUG);
//   }
//   if (options.nodePath) {
//     clientConfig['nodePath'] = options.nodePath;
//   }
//   clientConfig['nodePath'] = options.nodePath
//     ? options.nodePath
//     : utils.getDefaultNodePath();

//   const client = await PolykeyClient.createPolykeyClient(clientConfig);
//   const nodeMessage = new nodesPB.Node();
//   nodeMessage.setNodeId(options.nodeId);

//   try {
//     await client.start({});
//     const grpcClient = client.grpcClient;

//     const data: Array<string> = [];
//     const response = await binUtils.streamCallCARL(
//       client,
//       setupStreamCall<vaultsPB.List>(
//         client,
//         client.grpcClient.vaultsScan,
//       ),
//     )(nodeMessage);

//     for await (const vault of response.data) {
//       data.push(`${vault.getVaultName()}`);
//     }
//     await response.refresh;
//     process.stdout.write(
//       binUtils.outputFormatter({
//         type: options.format === 'json' ? 'json' : 'list',
//         data: data,
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

// export default commandScanVaults;
