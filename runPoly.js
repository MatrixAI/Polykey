
const {
  default: Logger,
  LogLevel,
  StreamHandler
} = require('@matrixai/logger');
const {
  default: PolykeyAgent
} = require('./dist/PolykeyAgent');





async function main() {
  const config0 = {
    nodeId: 'vfjhtp95eaa9dt95j5vn57llu8gl6nk6q883r9oa9e0fks93f96hg',
    nodePath: './tmp/node0',
    recoveryCode: 'interest quiz detect crystal trip silver number blouse antique fetch power powder quality absorb arrive air obscure fog mean recycle gold pulse tired alarm',
    host: '127.0.0.10',
    port: 55550,
  }
  const config1 = {
    nodeId: 'vl6alfugeie5c8ciuurobfg5bbht7evfkdbtgcdgp3f741h3av73g',
    nodePath: './tmp/node1',
    recoveryCode: 'three purpose twin wait spice bottom question wheat buyer special wreck critic casual token spread reveal topple grief draw leopard that music media intact',
    host: '127.0.0.11',
    port: 55551,
  }
  const config2 = {
    nodeId: 'vldm1mi2j8g8hdieeup5bdavqsnosth6vot235l5dqu5rlo4m6b9g',
    nodePath: './tmp/node2',
    recoveryCode: 'theory flip gasp velvet exit cliff wrestle cheap fork bulb trend sorry fetch share indicate announce envelope item chair token prize shield arrive nut',
    host: '127.0.0.12',
    port: 55552,
  }
  const config3 = {
    nodeId: 'vib6jj234uttetfpp8a3fo7j9adkamvf47k5ih5gt5rb8hbhs0ik0',
    nodePath: './tmp/node3',
    recoveryCode: 'country minor venture immune student combine client artefact whale sentence skull initial device grace suffer comfort skate aunt jungle cup tribe rude link pluck',
    host: '127.0.0.13',
    port: 55553,
  }
  const configs = [
    config0,
    config1,
    config2,
    config3,
  ];

  const testnet= {
    [config0.nodeId]: {
      host: config0.host,
      port: config0.port,
      scopes: ['external'],
    },
    [config1.nodeId]: {
      host: config1.host,
      port: config1.port,
      scopes: ['external'],
    },
    [config2.nodeId]: {
      host: config2.host,
      port: config2.port,
      scopes: ['external'],
    },
    [config3.nodeId]: {
      host: config3.host,
      port: config3.port,
      scopes: ['external'],
    },
  };

  const logger = new Logger('PolykeyAgent Test', LogLevel.INFO, [
    new StreamHandler(),
  ]);
  const num = parseInt(process.argv[2]);
  logger.warn(`hello! ${num}`);
  const config = configs[num];
  if (config == null) throw Error(`invalid config number ${num}`)
  await PolykeyAgent.createPolykeyAgent({
    password: 'password',
    options: {
      nodePath: config.nodePath,
      agentServiceHost: config.host,
      agentServicePort: config.port,
      clientServiceHost: config.host,
      clientServicePort: config.port,
      keys: {
        recoveryCode: config.recoveryCode,
      },
      seedNodes: testnet,
    },
    fresh: true,
    logger,
  });
}

main();
