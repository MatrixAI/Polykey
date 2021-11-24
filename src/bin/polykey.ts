#!/usr/bin/env node

import process from 'process';
import commander from 'commander';
import CommandBootstrap from './bootstrap';
import CommandAgent from './agent';
import CommandVaults from './vaults';
import CommandSecrets from './secrets';
import CommandKeys from './keys';
import CommandNodes from './nodes';
import CommandIdentities from './identities';
import CommandNotifications from './notifications';

import CommandPolykey from './CommandPolykey';
import * as binUtils from './utils';
import ErrorPolykey from '../ErrorPolykey';
import config from '../config';

async function main(argv = process.argv): Promise<number> {
  const rootCommand = new CommandPolykey();
  rootCommand.name('polykey');
  rootCommand.version(config.sourceVersion);
  rootCommand.description('Polykey CLI');
  rootCommand.addCommand(new CommandBootstrap());
  rootCommand.addCommand(new CommandAgent());
  rootCommand.addCommand(new CommandNodes());
  rootCommand.addCommand(new CommandSecrets());
  rootCommand.addCommand(new CommandKeys());
  rootCommand.addCommand(new CommandVaults());
  rootCommand.addCommand(new CommandIdentities());
  rootCommand.addCommand(new CommandNotifications());
  try {
    // `argv` will have node path and the script path as the first 2 parameters
    // navigates and executes the subcommand
    await rootCommand.parseAsync(argv);
    // Successful execution
    process.exitCode = 0;
  } catch (e) {
    if (e instanceof commander.CommanderError) {
      // Commander writes help and error messages on stderr automatically
      if (
        e.code === 'commander.help' ||
        e.code === 'commander.helpDisplayed' ||
        e.code === 'commander.version'
      ) {
        process.exitCode = 0;
      } else {
        // Other commander codes:
        // commander.unknownOption
        // commander.unknownCommand
        // commander.invalidArgument
        // commander.excessArguments
        // commander.missingArgument
        // commander.missingMandatoryOptionValue
        // commander.optionMissingArgument
        // use 64 for EX_USAGE
        process.exitCode = 64;
      }
    } else if (e instanceof ErrorPolykey) {
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          name: e.name,
          description: e.description,
          message: e.message,
        }),
      );
      process.exitCode = e.exitCode;
    } else {
      // Unknown error, this should not happen
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          name: e.name,
          description: e.message,
        }),
      );
      process.exitCode = 255;
    }
  }
  return process.exitCode;
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}

export default main;
