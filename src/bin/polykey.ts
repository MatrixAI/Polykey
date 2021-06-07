#!/usr/bin/env node

import process from 'process';
import commandBootstrap from './bootstrap';
import commandAgent from './agent';
import commandVaults from './vaults';
import commandSecrets from './secrets';
import commandKeys from './keys';
import commandNodes from './nodes';
import commandIdentities from './identities';
import commandEchoes from './echo';
import { createCommand } from './utils';

async function main(argv = process.argv): Promise<number> {
  const rootCommand = createCommand();
  // Do this manually as it will break the folder structure when building and importing package.json here
  rootCommand.version('0.0.41');
  rootCommand.enablePositionalOptions();
  rootCommand.exitOverride();
  rootCommand.addCommand(commandBootstrap);
  rootCommand.addCommand(commandAgent);
  rootCommand.addCommand(commandVaults);
  rootCommand.addCommand(commandSecrets);
  rootCommand.addCommand(commandKeys);
  rootCommand.addCommand(commandNodes);
  rootCommand.addCommand(commandIdentities);
  rootCommand.addCommand(commandEchoes);
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
      process.exitCode = e.exitCode;
    }
    if (process.exitCode == null) {
      process.exitCode = -1;
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
