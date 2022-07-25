#!/usr/bin/env node

import fs from 'fs';
import process from 'process';
/**
 * Hack for wiping out the threads signal handlers
 * See: https://github.com/andywer/threads.js/issues/388
 * This is done statically during this import
 * It is essential that the threads import here is very first import of threads module
 * in the entire codebase for this hack to work
 * If the worker manager is used, it must be stopped gracefully with the PolykeyAgent
 */
import 'threads';
process.removeAllListeners('SIGINT');
process.removeAllListeners('SIGTERM');
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

process.title = 'polykey';

async function main(argv = process.argv): Promise<number> {
  // Registers signal and process error handler
  // Any resource cleanup must be resolved within their try-catch block
  // Leaf commands may register exit handlers in case of signal exits
  // Process error handler should only be used by non-terminating commands
  // When testing, this entire must be mocked to be a noop
  const exitHandlers = new binUtils.ExitHandlers();
  const rootCommand = new CommandPolykey({ exitHandlers, fs });
  rootCommand.name('polykey');
  rootCommand.version(config.sourceVersion);
  rootCommand.description('Polykey CLI');
  rootCommand.addCommand(new CommandBootstrap({ exitHandlers, fs }));
  rootCommand.addCommand(new CommandAgent({ exitHandlers, fs }));
  rootCommand.addCommand(new CommandNodes({ exitHandlers, fs }));
  rootCommand.addCommand(new CommandSecrets({ exitHandlers, fs }));
  rootCommand.addCommand(new CommandKeys({ exitHandlers, fs }));
  rootCommand.addCommand(new CommandVaults({ exitHandlers, fs }));
  rootCommand.addCommand(new CommandIdentities({ exitHandlers, fs }));
  rootCommand.addCommand(new CommandNotifications({ exitHandlers, fs }));
  try {
    // `argv` will have node path and the script path as the first 2 parameters
    // navigates and executes the subcommand
    await rootCommand.parseAsync(argv);
    // Successful execution (even if the command was non-terminating)
    process.exitCode = 0;
  } catch (e) {
    const errFormat = rootCommand.opts().format === 'json' ? 'json' : 'error';
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
          type: errFormat,
          data: e,
        }),
      );
      process.exitCode = e.exitCode;
    } else {
      // Unknown error, this should not happen
      process.stderr.write(
        binUtils.outputFormatter({
          type: errFormat,
          data: e,
        }),
      );
      process.exitCode = 255;
    }
  }
  return process.exitCode;
}

if (require.main === module) {
  void main();
}

export default main;
