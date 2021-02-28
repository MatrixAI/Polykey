#!/usr/bin/env node

import process from 'process';
import commandKeys from './keys';
import commandSecrets from './secrets';
import commandVaults from './vaults';
import commandNodes from './nodes';
import commandGestalts from './gestalts';
import commandSocial from './social';
import commandCrypto from './crypto';
import commandAgent from './agent';
import commandCA from './ca';
import commandOAuth from './oauth';
import { createCommand } from './utils';
import packageJson from '../../package.json';

async function main(argv = process.argv): Promise<number> {
  const rootCommand = createCommand();
  rootCommand.version(packageJson.version);
  rootCommand.enablePositionalOptions();
  rootCommand.exitOverride();
  rootCommand.addCommand(commandKeys);
  rootCommand.addCommand(commandSecrets);
  rootCommand.addCommand(commandVaults);
  rootCommand.addCommand(commandNodes);
  rootCommand.addCommand(commandGestalts);
  rootCommand.addCommand(commandSocial);
  rootCommand.addCommand(commandCrypto);
  rootCommand.addCommand(commandAgent);
  rootCommand.addCommand(commandCA);
  rootCommand.addCommand(commandOAuth);
  try {
    // argv will have node path and the script path as the first 2 parameters
    await rootCommand.parseAsync(argv);
  } catch (e) {
    if (
      e.code === 'commander.help' ||
      e.code === 'commander.helpDisplayed' ||
      e.code === 'commander.version'
    ) {
      process.exitCode = 0;
    } else {
      console.log(e);
      process.exitCode = 1;
    }
    return process.exitCode;
  }
  process.exitCode = 0;
  return process.exitCode;
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}

export default main;
