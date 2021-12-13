import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandAllow extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('allow');
    this.description('Allow Permission for Identity');
    this.argument(
      '<gestaltId>',
      'Node ID or `Provider Id:Identity Id`',
      parsers.parseGestaltId,
    );
    this.argument('<permissions>', 'permission to set');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (gestaltId, permissions, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const identitiesPB = await import(
        '../../proto/js/polykey/v1/identities/identities_pb'
      );
      const permissionsPB = await import(
        '../../proto/js/polykey/v1/permissions/permissions_pb'
      );
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');

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
        const setActionMessage = new permissionsPB.ActionSet();
        setActionMessage.setAction(permissions);
        let name: string;
        if (gestaltId.nodeId) {
          // Setting by Node
          const nodeMessage = new nodesPB.Node();
          nodeMessage.setNodeId(gestaltId.nodeId);
          setActionMessage.setNode(nodeMessage);
          name = `${gestaltId.nodeId}`;
          // Trusting
          await binUtils.retryAuthentication(
            (auth) =>
              grpcClient.gestaltsActionsSetByNode(setActionMessage, auth),
            meta,
          );
        } else {
          // Setting By Identity
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(gestaltId.providerId);
          providerMessage.setMessage(gestaltId.identityId);
          setActionMessage.setIdentity(providerMessage);
          name = `${parsers.formatIdentityString(
            gestaltId.providerId,
            gestaltId.identityId,
          )}`;
          await binUtils.retryAuthentication(
            (auth) =>
              grpcClient.gestaltsActionsSetByIdentity(setActionMessage, auth),
            meta,
          );
        }
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Allowing: ${name} ${permissions}`],
          }),
        );
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandAllow;
