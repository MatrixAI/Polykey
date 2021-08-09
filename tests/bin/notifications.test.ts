import type { NodeId, NodeAddress } from '@/nodes/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as utils from './utils';
import * as testUtils from './utils';
import { PolykeyAgent } from '@';

const logger = new Logger('pkWithStdio Test', LogLevel.WARN, [
  new StreamHandler(),
]);
let senderDataDir: string, receiverDataDir: string;
let senderNodePath: string, receiverNodePath: string;
let senderPasswordFile: string, receiverPasswordFile: string;
let senderPolykeyAgent: PolykeyAgent, receiverPolykeyAgent: PolykeyAgent;
let senderNodeId: NodeId, receiverNodeId: NodeId;

function genCommandsSender(options: Array<string>) {
  return ['notifications', ...options, '-np', senderNodePath];
}

function genCommandsReceiver(options: Array<string>) {
  return ['notifications', ...options, '-np', receiverNodePath];
}

describe('CLI Notifications', () => {
  beforeEach(async () => {
    senderDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    receiverDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    senderNodePath = path.join(senderDataDir, 'sender');
    receiverNodePath = path.join(receiverDataDir, 'receiver');
    senderPasswordFile = path.join(senderDataDir, 'passwordFile');
    receiverPasswordFile = path.join(senderDataDir, 'passwordFile');
    await fs.promises.writeFile(senderPasswordFile, 'password');
    await fs.promises.writeFile(receiverPasswordFile, 'password');
    senderPolykeyAgent = new PolykeyAgent({
      nodePath: senderNodePath,
      logger: logger,
    });
    receiverPolykeyAgent = new PolykeyAgent({
      nodePath: receiverNodePath,
      logger: logger,
    });
    await senderPolykeyAgent.start({
      password: 'password',
    });
    await receiverPolykeyAgent.start({
      password: 'password',
    });
    senderNodeId = senderPolykeyAgent.nodes.getNodeId();
    receiverNodeId = receiverPolykeyAgent.nodes.getNodeId();
    await senderPolykeyAgent.nodes.setNode(receiverNodeId, {
      ip: receiverPolykeyAgent.revProxy.getIngressHost(),
      port: receiverPolykeyAgent.revProxy.getIngressPort(),
    } as NodeAddress);

    // Authorize session
    await utils.pk([
      'agent',
      'unlock',
      '-np',
      senderNodePath,
      '--password-file',
      senderPasswordFile,
    ]);
    await utils.pk([
      'agent',
      'unlock',
      '-np',
      receiverNodePath,
      '--password-file',
      receiverPasswordFile,
    ]);
    await receiverPolykeyAgent.notifications.clearNotifications();
  });
  afterEach(async () => {
    await senderPolykeyAgent.stop();
    await receiverPolykeyAgent.stop();
    await fs.promises.rmdir(senderDataDir, { recursive: true });
    await fs.promises.rmdir(receiverDataDir, { recursive: true });
  });

  describe('commandSendNotification', () => {
    test('Should send notification with permission.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      const commands = genCommandsSender(['send', receiverNodeId, 'msg']);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); // Succeeds
      expect(result.stdout).toContain('msg');
      const notifications =
        await receiverPolykeyAgent.notifications.readNotifications();
      expect(notifications).toContain('msg');
    });
    test('Should send notification without permission.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {},
        vaults: {},
      });
      const commands = genCommandsSender(['send', receiverNodeId, 'msg']);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); // Succeeds
      expect(result.stdout).toContain('msg');
      const notifications =
        await receiverPolykeyAgent.notifications.readNotifications();
      expect(notifications).toEqual([]); // Notification should be sent but not received
    });
  });
  describe('commandReadNotifications', () => {
    test('Should read all notifications.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      const senderCommands1 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg1',
      ]);
      const senderCommands2 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg2',
      ]);
      const senderCommands3 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg3',
      ]);
      await testUtils.pkWithStdio(senderCommands1);
      await testUtils.pkWithStdio(senderCommands2);
      await testUtils.pkWithStdio(senderCommands3);
      const receiverCommands = genCommandsReceiver(['read']);
      const result1 = await testUtils.pkWithStdio(receiverCommands);
      expect(result1.code).toBe(0);
      expect(result1.stdout).toContain('msg1');
      expect(result1.stdout).toContain('msg2');
      expect(result1.stdout).toContain('msg3');
      const senderCommands4 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg4',
      ]);
      await testUtils.pkWithStdio(senderCommands4);
      const result2 = await testUtils.pkWithStdio(receiverCommands);
      expect(result2.code).toBe(0);
      expect(result2.stdout).toContain('msg1');
      expect(result2.stdout).toContain('msg2');
      expect(result2.stdout).toContain('msg3');
      expect(result2.stdout).toContain('msg4');
    });
    test('Should read all unread notifications.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      const senderCommands1 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg1',
      ]);
      const senderCommands2 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg2',
      ]);
      const senderCommands3 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg3',
      ]);
      await testUtils.pkWithStdio(senderCommands1);
      await testUtils.pkWithStdio(senderCommands2);
      await testUtils.pkWithStdio(senderCommands3);
      const receiverCommands1 = genCommandsReceiver(['read']);
      await testUtils.pkWithStdio(receiverCommands1);
      const senderCommands4 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg4',
      ]);
      await testUtils.pkWithStdio(senderCommands4);
      const receiverCommands2 = genCommandsReceiver(['read', '--unread']);
      const result = await testUtils.pkWithStdio(receiverCommands2);
      expect(result.code).toBe(0);
      expect(result.stdout).not.toContain('msg1'); // previously read notifications should be ignored
      expect(result.stdout).not.toContain('msg2');
      expect(result.stdout).not.toContain('msg3');
      expect(result.stdout).toContain('msg4');
    });
    test('Should read a fixed number of notifications.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      const senderCommands1 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg1',
      ]);
      const senderCommands2 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg2',
      ]);
      const senderCommands3 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg3',
      ]);
      await testUtils.pkWithStdio(senderCommands1);
      await testUtils.pkWithStdio(senderCommands2);
      await testUtils.pkWithStdio(senderCommands3);
      const receiverCommands = genCommandsReceiver(['read', '-n', '2']);
      const result = await testUtils.pkWithStdio(receiverCommands);
      expect(result.code).toBe(0);
      expect(result.stdout).not.toContain('msg1'); // oldest notification not included
      expect(result.stdout).toContain('msg2');
      expect(result.stdout).toContain('msg3');
    });
    test('Should read notifications in reverse order.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      const senderCommands1 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg1',
      ]);
      const senderCommands2 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg2',
      ]);
      const senderCommands3 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg3',
      ]);
      await testUtils.pkWithStdio(senderCommands1);
      await testUtils.pkWithStdio(senderCommands2);
      await testUtils.pkWithStdio(senderCommands3);
      const receiverCommands = genCommandsReceiver([
        'read',
        '-u',
        'true',
        '-n',
        '1',
        '-o',
        'oldest',
      ]);
      const result1 = await testUtils.pkWithStdio(receiverCommands);
      const result2 = await testUtils.pkWithStdio(receiverCommands);
      const result3 = await testUtils.pkWithStdio(receiverCommands);
      expect(result1.code).toBe(0);
      expect(result2.code).toBe(0);
      expect(result3.code).toBe(0);
      expect(result1.stdout).toContain('msg1');
      expect(result2.stdout).toContain('msg2');
      expect(result3.stdout).toContain('msg3');
    });
    test('Should read no notifications.', async () => {
      const receiverCommands = genCommandsReceiver(['read']);
      const result = await testUtils.pkWithStdio(receiverCommands);
      expect(result.code).toBe(0);
      expect(result.stdout).toEqual('No notifications to display\n');
    });
  });
  describe('commandClearNotifications', () => {
    test('Should remove all notifications.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      const senderCommands1 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg1',
      ]);
      const senderCommands2 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg2',
      ]);
      const senderCommands3 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg3',
      ]);
      await testUtils.pkWithStdio(senderCommands1);
      await testUtils.pkWithStdio(senderCommands2);
      await testUtils.pkWithStdio(senderCommands3);
      const receiverCommandsClear = genCommandsReceiver(['clear']);
      const receiverCommandsRead = genCommandsReceiver(['read']);
      await testUtils.pkWithStdio(receiverCommandsClear);
      const result = await testUtils.pkWithStdio(receiverCommandsRead);
      expect(result.code).toBe(0);
      expect(result.stdout).toEqual('No notifications to display\n'); // should be no notifications left
    });
  });
});
