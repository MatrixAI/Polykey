/**
 * Options and Arguments used by commands
 * Use PolykeyCommand.addOption or PolykeyCommand.addArgument
 * @module
 */

import commander from 'commander';
import * as parsers from './parsers';
import * as binUtils from './utils';

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
).default(binUtils.getDefaultNodePath());

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

const nodeId = new commander.Option('-ni', '--node-id <id>').env('PK_NODE_ID');

const clientHost = new commander.Option(
  '-ch, --client-host <address>',
  'Client Host Address',
)
  .env('PK_CLIENT_HOST')
  .default('127.0.0.1');

const clientPort = new commander.Option(
  '-cp, --client-port <port>',
  'Client Port',
)
  .argParser(parsers.parseNumber)
  .env('PK_CLIENT_PORT')
  .default(0);

const recoveryCodeFile = new commander.Option(
  '-rcf, --recovery-code-file <path>',
  'Path to Recovery Code',
);

const passwordFile = new commander.Option(
  '-pf, --password-file <path>',
  'Path to Password',
);

export {
  nodePath,
  format,
  verbose,
  nodeId,
  clientHost,
  clientPort,
  recoveryCodeFile,
  passwordFile,
};
