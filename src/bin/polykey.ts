#!/usr/bin/env node

import process from 'process';
import commander from 'commander';
import commandKeys from './keys';
import commandGestalts from './gestalts';
import commandSocial from './social';
import commandSecrets from './secrets';
import commandVaults from './vaults';
import commandPeers from './peers';
import commandCrypto from './crypto';
import commandAgent from './agent';
import commandCA from './ca';
import commandOAuth from './oauth';

function main(argv = process.argv): number {
  const polykey = new commander.Command();
  polykey.version('0.0.1');
  polykey.exitOverride();
  polykey.addCommand(commandKeys);
  polykey.addCommand(commandSecrets);
  polykey.addCommand(commandVaults);
  polykey.addCommand(commandPeers);
  polykey.addCommand(commandGestalts);
  polykey.addCommand(commandSocial);
  polykey.addCommand(commandCrypto);
  polykey.addCommand(commandAgent);
  polykey.addCommand(commandCA);
  polykey.addCommand(commandOAuth);
  try {
    polykey.parse(argv);
  } catch (e) {
    if (e.code == 'commander.help') {
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
    return process.exitCode;
  }
  process.exitCode = 0;
  return process.exitCode;
}

if (require.main === module) {
  main();
}

export default main;
