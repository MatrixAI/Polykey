// import type { NodeAddress, NodeId } from '../../nodes/types';

import fs from 'fs';
import prompts from 'prompts';
// import { pki } from 'node-forge';
import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
// import PolykeyAgent from '../../PolykeyAgent';
// import { priv } from '../../certs/bootstrap.polykey.io.key';
// import { pub } from '../../certs/bootstrap.polykey.io.pub';
// import { cert } from '../../certs/bootstrap.polykey.io.crt';
import { bootstrapPolykeyState } from '../../bootstrap';

import * as utils from '../../utils';
import * as binUtils from '../utils';

/* IGNORE THIS FOR NOW; this is dealing with bootstrap certs which are a future issue
 * This is where the bootstrap node information will be added
 * Here the bootstrap certs need to have the Node ID and Address or there needs to be a
 * specific function to add bootstrap certs
 * const privateKey = pki.privateKeyFromPem(priv);
 * const publicKey = pki.publicKeyFromPem(pub);
 * const certificate = pki.certificateFromPem(cert);
 * const id = certificate.extensions.pop().subjectKeyIdentifier;
 * const ip = certificate.extensions.pop().altNames.pop().ip;
 * console.log(id, ip);
 * await agent.nodes.setNode(id as NodeId, { ip: ip, port: 0 } as NodeAddress);
 */

const commandBootstrapAgent = binUtils.createCommand('bootstrap', {
  description: 'Initializes a polykey node',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandBootstrapAgent.action(async (options) => {
  const agentConfig = {};
  const logger = new Logger('CLI Logger', LogLevel.WARN, [new StreamHandler()]);
  agentConfig['logger'] = logger;

  let password;
  if (options.verbose) {
    agentConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  const nodePath = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  agentConfig['nodePath'] = nodePath;

  if (options.passwordFile) {
    password = await fs.promises.readFile(options.passwordFile, {
      encoding: 'utf-8',
    });
  } else {
    let success = false;
    while (!success) {
      const response = await prompts({
        type: 'text',
        name: 'password',
        message: 'Please enter a password for your Polykey Node:',
      });
      password = response.password;
      const confirm = await prompts({
        type: 'text',
        name: 'confirm',
        message: 'Please re-enter your password:',
      });
      const passwordConfirm = confirm.confirm;
      if (password === passwordConfirm) {
        success = true;
      } else {
        logger.warn('Passwords did not match, please try again');
      }
    }
  }

  try {
    await bootstrapPolykeyState(nodePath, password);

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Polykey bootstrapped at Node Path: ${nodePath}`],
      }),
    );
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.description}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.description}\n`);
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.description],
        }),
      );
    }
    throw err;
  }
});

export default commandBootstrapAgent;
