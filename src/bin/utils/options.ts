/**
 * Options and Arguments used by commands
 * Use PolykeyCommand.addOption or PolykeyCommand.addArgument
 * @module
 */
import commander from 'commander';
import * as binParsers from './parsers';
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

const passwordFile = new commander.Option(
  '-pf, --password-file <path>',
  'Path to Password',
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
  recoveryCodeFile,
  passwordFile,
  background,
  backgroundOutFile,
  backgroundErrFile,
  rootKeyPairBits,
};
