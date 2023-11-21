import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type { NodeId } from '@/ids';
import type { KeyRing } from '@/keys';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { Timer } from '@matrixai/timer';
import { destroyed } from '@matrixai/async-init';
import * as keysUtils from '@/keys/utils';
import * as nodesEvents from '@/nodes/events';
import * as nodesErrors from '@/nodes/errors';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodesConnectionSignalFinal from '@/nodes/agent/handlers/NodesConnectionSignalFinal';
import NodesConnectionSignalInitial from '@/nodes/agent/handlers/NodesConnectionSignalInitial';
import * as nodesUtils from '@/nodes/utils';
import * as testsUtils from '../utils';

describe(`NodeConnectionManager`, () => {
  const logger = new Logger(
    `${NodeConnectionManager.name} test`,
    LogLevel.WARN,
    [
      new StreamHandler(
        formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
      ),
    ],
  );
  const localHost = '127.0.0.1' as Host;
  const dummyManifest = {} as AgentServerManifest;
  const timeoutTime = 300;

  test.todo('NodeManager readiness');
  test.todo('stopping NodeManager should cancel all tasks');
  test.todo('task handler ids are not empty');
});
