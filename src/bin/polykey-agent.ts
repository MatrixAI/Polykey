#!/usr/bin/env node
/**
 * The is an internal script for running the PolykeyAgent as a child process
 * This is not to be exported for external execution
 * @module
 */
import type { AgentChildProcessInput, AgentChildProcessOutput } from './types';
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
import Logger, { StreamHandler } from '@matrixai/logger';
import * as binUtils from './utils';
import PolykeyAgent from '../PolykeyAgent';
import ErrorPolykey from '../ErrorPolykey';
import { promisify, promise } from '../utils';

process.title = 'polykey-agent';

const logger = new Logger('polykey', undefined, [new StreamHandler()]);

/**
 * Starts the agent process
 */
async function main(_argv = process.argv): Promise<number> {
  const exitHandlers = new binUtils.ExitHandlers();
  const processSend = promisify<void>(process.send!.bind(process));
  const { p: messageInP, resolveP: resolveMessageInP } =
    promise<AgentChildProcessInput>();
  process.once('message', (data) => {
    resolveMessageInP(data);
  });
  const messageIn = await messageInP;
  logger.setLevel(messageIn.logLevel);
  let pkAgent: PolykeyAgent;
  exitHandlers.handlers.push(async () => {
    if (pkAgent != null) await pkAgent.stop();
  });
  try {
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      fs,
      logger: logger.getChild(PolykeyAgent.name),
      ...messageIn.agentConfig,
    });
  } catch (e) {
    if (e instanceof ErrorPolykey) {
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
    const messageOut: AgentChildProcessOutput = {
      status: 'FAILURE',
      error: {
        name: e.name,
        description: e.description,
        message: e.message,
        exitCode: e.exitCode,
        data: e.data,
        stack: e.stack,
      },
    };
    try {
      await processSend(messageOut);
    } catch (e) {
      // If processSend itself failed here
      // There's no point attempting to propagate the error to the parent
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          name: e.name,
          description: e.message,
        }),
      );
      process.exitCode = 255;
    }
    return process.exitCode;
  }
  const messageOut: AgentChildProcessOutput = {
    status: 'SUCCESS',
    recoveryCode: pkAgent.keyManager.getRecoveryCode(),
  };
  try {
    await processSend(messageOut);
  } catch (e) {
    // If processSend itself failed here
    // There's no point attempting to propagate the error to the parent
    process.stderr.write(
      binUtils.outputFormatter({
        type: 'error',
        name: e.name,
        description: e.message,
      }),
    );
    process.exitCode = 255;
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
