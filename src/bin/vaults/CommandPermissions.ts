// Import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
// import PolykeyClient from '../../PolykeyClient';
// import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
// import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
// import * as utils from '../../utils';
// import * as binUtils from '../utils';
// import * as grpcErrors from '../../grpc/errors';

// import CommandPolykey from '../CommandPolykey';
// import * as binOptions from '../utils/options';

// class CommandPermissions extends CommandPolykey {
//   constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
//     super(...args);
//     this.name('permissions');
//     this.description('Vaults Permissions');
//     this.arguments('<vaultName> [nodeId]');
//     this.addOption(binOptions.nodeId);
//     this.addOption(binOptions.clientHost);
//     this.addOption(binOptions.clientPort);
//     this.action(async (vaultName, nodeId, options) => {

//     });
//   }
// }

// export default CommandPermissions;

// OLD COMMAND
// const permissions = binUtils.createCommand('permissions', {
//   description: {
//     description: 'Sets the permissions of a vault for Node Ids',
//     args: {
//       vaultName: 'Name or ID of the vault',
//       nodeId: '(optional) nodeId to check permission on',
//     },
//   },
//   aliases: ['perms'],
//   nodePath: true,
//   verbose: true,
//   format: true,
// });
// permissions.arguments('<vaultName> [nodeId]');
// permissions.action(async (vaultName, nodeId, options) => {
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
//   vaultMessage.setNameOrId(vaultName);

//   const nodeMessage = new nodesPB.Node();
//   nodeMessage.setNodeId(nodeId);

//   const getVaultMessage = new vaultsPB.PermGet();
//   getVaultMessage.setVault(vaultMessage);
//   getVaultMessage.setNode(nodeMessage);

//   try {
//     await client.start({});
//     const grpcClient = client.grpcClient;

//     const data: Array<string> = [];
//     const response = await binUtils.streamCallCARL(
//       client,
//       setupStreamCall<vaultsPB.Permission>(
//         client,
//         client.grpcClient.vaultPermissions,
//       ),
//     )(getVaultMessage);

//     for await (const perm of response.data) {
//       data.push(`${perm.getNodeId()}:\t\t${perm.getAction()}`);
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
//     }
//     throw err;
//   } finally {
//     await client.stop();
//     options.nodePath = undefined;
//     options.verbose = undefined;
//     options.format = undefined;
//   }
// });

// export default permissions;
