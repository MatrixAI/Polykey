/**
 * Options and Arguments used by commands
 * Use PolykeyCommand.addOption or PolykeyCommand.addArgument
 * @module
 */
import commander from 'commander';
import * as binParsers from '../utils/parsers';
import config from '../../config';

/**
 * Node path is the path to node state
 * This is a directory on the filesystem
 * This is optional, if it is not specified, we will derive
 * platform-specific default node path
 * On unknown platforms the the default is undefined
 */
const nodePath = new commander.Option(
  '-np, --node-path <path>',
  'Path to Node State',
)
  .env('PK_NODE_PATH')
  .default(config.defaults.nodePath);

/**
 * Formatting choice of human, json, defaults to human
 */
const format = new commander.Option('-f, --format <format>', 'Output Format')
  .choices(['human', 'json'])
  .default('human');

/**
 * Sets log level, defaults to 0, multiple uses will increase verbosity level
 */
const verbose = new commander.Option('-v, --verbose', 'Log Verbose Messages')
  .argParser((_, p: number) => {
    return p + 1;
  })
  .default(0);

/**
 * Ignore any existing state during side-effectful construction
 */
const fresh = new commander.Option(
  '--fresh',
  'Ignore existing state during construction',
).default(false);

/**
 * Node ID used for connecting to a remote agent
 */
const nodeId = new commander.Option('-ni, --node-id <id>').env('PK_NODE_ID');

/**
 * Client host used for connecting to remote agent
 */
const clientHost = new commander.Option(
  '-ch, --client-host <host>',
  'Client Host Address',
).env('PK_CLIENT_HOST');

/**
 * Client port used for connecting to remote agent
 */
const clientPort = new commander.Option(
  '-cp, --client-port <port>',
  'Client Port',
)
  .argParser(binParsers.parseNumber)
  .env('PK_CLIENT_PORT');

const ingressHost = new commander.Option(
  '-ih, --ingress-host <host>',
  'Ingress host',
)
  .env('PK_INGRESS_HOST')
  .default(config.defaults.networkConfig.ingressHost);

const ingressPort = new commander.Option(
  '-ip, --ingress-port <port>',
  'Ingress Port',
)
  .argParser(binParsers.parseNumber)
  .env('PK_INGRESS_PORT')
  .default(config.defaults.networkConfig.ingressPort);

const connTimeoutTime = new commander.Option(
  '--connection-timeout <ms>',
  'Timeout value for connection establishment between nodes',
)
  .argParser(binParsers.parseNumber)
  .default(config.defaults.forwardProxyConfig.connTimeoutTime);

const passwordFile = new commander.Option(
  '-pf, --password-file <path>',
  'Path to Password',
);

const passwordNewFile = new commander.Option(
  '-pnf, --password-new-file <path>',
  'Path to new Password',
);

const recoveryCodeFile = new commander.Option(
  '-rcf, --recovery-code-file <path>',
  'Path to Recovery Code',
);

const background = new commander.Option(
  '-b, --background',
  'Starts the agent as a background process',
);

const backgroundOutFile = new commander.Option(
  '-bof, --background-out-file <path>',
  'Path to STDOUT for agent process',
);

const backgroundErrFile = new commander.Option(
  '-bef, --background-err-file <path>',
  'Path to STDERR for agent process',
);

const rootKeyPairBits = new commander.Option(
  '-rkpb --root-key-pair-bits <bitsize>',
  'Bit size of root key pair',
).argParser(binParsers.parseNumber);

const seedNodes = new commander.Option(
  '-sn, --seed-nodes [nodeId1@host:port;nodeId2@host:port;...]',
  'Seed node address mappings',
)
  .argParser(binParsers.parseSeedNodes)
  .env('PK_SEED_NODES')
  .default([{}, true]);

const network = new commander.Option(
  '-n --network <network>',
  'Setting the desired default network.',
)
  .argParser(binParsers.parseNetwork)
  .env('PK_NETWORK')
  .default(config.defaults.network.mainnet);

const workers = new commander.Option(
  '-w --workers <count>',
  'Number of workers to use, defaults to number of cores with `all`, 0 means no multi-threading',
)
  .argParser(binParsers.parseCoreCount)
  .default(undefined);

export {
  nodePath,
  format,
  verbose,
  fresh,
  nodeId,
  clientHost,
  clientPort,
  ingressHost,
  ingressPort,
  connTimeoutTime,
  recoveryCodeFile,
  passwordFile,
  passwordNewFile,
  background,
  backgroundOutFile,
  backgroundErrFile,
  rootKeyPairBits,
  seedNodes,
  network,
  workers,
};
