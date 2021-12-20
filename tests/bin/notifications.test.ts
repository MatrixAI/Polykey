import type { NodeId, NodeAddress } from '@/nodes/types';
import type { NotificationData } from '@/notifications/types';
import type { VaultName } from '@/vaults/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as idUtils } from '@matrixai/id';
import PolykeyAgent from '@/PolykeyAgent';
import { makeVaultId } from '@/vaults/utils';
import * as utils from './utils';
import * as testUtils from './utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('CLI Notifications', () => {
  const password = 'password';
  const logger = new Logger('pkStdio Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let senderDataDir: string, receiverDataDir: string;
  let senderNodePath: string, receiverNodePath: string;
  let senderPasswordFile: string, receiverPasswordFile: string;
  let senderPolykeyAgent: PolykeyAgent, receiverPolykeyAgent: PolykeyAgent;
  let senderNodeId: NodeId;
  let receiverNodeId: NodeId;

  // Helper functions
  function genCommandsSender(options: Array<string>) {
    return ['notifications', ...options, '-np', senderNodePath];
  }

  function genCommandsReceiver(options: Array<string>) {
    return ['notifications', ...options, '-np', receiverNodePath];
  }

  beforeAll(async () => {
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
    senderPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: senderNodePath,
      logger: logger,
    });
    receiverPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: receiverNodePath,
      logger: logger,
    });
    senderNodeId = senderPolykeyAgent.nodeManager.getNodeId();
    receiverNodeId = receiverPolykeyAgent.nodeManager.getNodeId();
    await senderPolykeyAgent.nodeManager.setNode(receiverNodeId, {
      host: receiverPolykeyAgent.revProxy.ingressHost,
      port: receiverPolykeyAgent.revProxy.ingressPort,
    } as NodeAddress);

    // Authorize session
    await utils.pkStdio([
      'agent',
      'unlock',
      '-np',
      senderNodePath,
      '--password-file',
      senderPasswordFile,
    ]);
    await utils.pkStdio([
      'agent',
      'unlock',
      '-np',
      receiverNodePath,
      '--password-file',
      receiverPasswordFile,
    ]);
    await receiverPolykeyAgent.notificationsManager.clearNotifications();
  }, global.polykeyStartupTimeout * 2);
  afterAll(async () => {
    await senderPolykeyAgent.stop();
    await senderPolykeyAgent.destroy();
    await receiverPolykeyAgent.stop();
    await receiverPolykeyAgent.destroy();
    await fs.promises.rmdir(senderDataDir, { recursive: true });
    await fs.promises.rmdir(receiverDataDir, { recursive: true });
  });
  afterEach(async () => {
    await receiverPolykeyAgent.notificationsManager.clearNotifications();
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
      const result = await testUtils.pkStdio(commands, {}, senderDataDir);
      expect(result.exitCode).toBe(0); // Succeeds
      const notifications =
        await receiverPolykeyAgent.notificationsManager.readNotifications();
      expect(notifications[0].data).toEqual({
        type: 'General',
        message: 'msg',
      });
    });
    test('Should send notification without permission.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {},
        vaults: {},
      });
      const commands = genCommandsSender(['send', receiverNodeId, 'msg']);
      const result = await testUtils.pkStdio(commands, {}, senderDataDir);
      expect(result.exitCode).toBe(0); // Succeeds
      const notifications =
        await receiverPolykeyAgent.notificationsManager.readNotifications();
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
      await testUtils.pkStdio(senderCommands1, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands2, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands3, {}, senderDataDir);
      const receiverCommands = genCommandsReceiver(['read']);
      const result1 = await testUtils.pkStdio(
        receiverCommands,
        {},
        receiverDataDir,
      );
      expect(result1.exitCode).toBe(0);
      expect(result1.stdout).toContain('msg1');
      expect(result1.stdout).toContain('msg2');
      expect(result1.stdout).toContain('msg3');
      const senderCommands4 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg4',
      ]);
      await testUtils.pkStdio(senderCommands4, {}, senderDataDir);
      const result2 = await testUtils.pkStdio(
        receiverCommands,
        {},
        receiverDataDir,
      );
      expect(result2.exitCode).toBe(0);
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
      await testUtils.pkStdio(senderCommands1, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands2, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands3, {}, senderDataDir);
      const receiverCommands1 = genCommandsReceiver(['read']);
      await testUtils.pkStdio(receiverCommands1, {}, receiverDataDir);
      const senderCommands4 = genCommandsSender([
        'send',
        receiverNodeId,
        'msg4',
      ]);
      await testUtils.pkStdio(senderCommands4, {}, senderDataDir);
      const receiverCommands2 = genCommandsReceiver(['read', '--unread']);
      const result = await testUtils.pkStdio(
        receiverCommands2,
        {},
        receiverDataDir,
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('msg1'); // Previously read notifications should be ignored
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
      await testUtils.pkStdio(senderCommands1, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands2, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands3, {}, senderDataDir);
      const receiverCommands = genCommandsReceiver(['read', '--number', '2']);
      const result = await testUtils.pkStdio(
        receiverCommands,
        {},
        receiverDataDir,
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('msg1'); // Oldest notification not included
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
      await testUtils.pkStdio(senderCommands1, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands2, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands3, {}, senderDataDir);
      const receiverCommands = genCommandsReceiver([
        'read',
        '--unread',
        '--number',
        '1',
        '--order',
        'oldest',
      ]);
      const result1 = await testUtils.pkStdio(
        receiverCommands,
        {},
        receiverDataDir,
      );
      const result2 = await testUtils.pkStdio(
        receiverCommands,
        {},
        receiverDataDir,
      );
      const result3 = await testUtils.pkStdio(
        receiverCommands,
        {},
        receiverDataDir,
      );
      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result3.exitCode).toBe(0);
      expect(result1.stdout).toContain('msg1');
      expect(result2.stdout).toContain('msg2');
      expect(result3.stdout).toContain('msg3');
    });
    test('Should read no notifications.', async () => {
      const receiverCommands = genCommandsReceiver(['read']);
      const result = await testUtils.pkStdio(
        receiverCommands,
        {},
        receiverDataDir,
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toEqual('No notifications to display\n');
    });
    test('Should read all types of notifications.', async () => {
      await receiverPolykeyAgent.acl.setNodePerm(senderNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      const notificationData1: NotificationData = {
        type: 'General',
        message: 'msg',
      };
      const notificationData2: NotificationData = {
        type: 'GestaltInvite',
      };
      const notificationData3: NotificationData = {
        type: 'VaultShare',
        vaultId: makeVaultId(idUtils.fromString('vaultId')).toString(),
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        },
      };
      await senderPolykeyAgent.notificationsManager.sendNotification(
        receiverNodeId,
        notificationData1,
      );
      await senderPolykeyAgent.notificationsManager.sendNotification(
        receiverNodeId,
        notificationData2,
      );
      await senderPolykeyAgent.notificationsManager.sendNotification(
        receiverNodeId,
        notificationData3,
      );
      const commands = genCommandsReceiver(['read']);
      const result = await testUtils.pkStdio(commands, {}, receiverDataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Message from Keynode');
      expect(result.stdout).toContain('invited you to join their Gestalt');
      expect(result.stdout).toContain('shared their vault');
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
      await testUtils.pkStdio(senderCommands1, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands2, {}, senderDataDir);
      await testUtils.pkStdio(senderCommands3, {}, senderDataDir);
      const receiverCommandsClear = genCommandsReceiver(['clear']);
      const receiverCommandsRead = genCommandsReceiver(['read']);
      await testUtils.pkStdio(receiverCommandsClear);
      const result = await testUtils.pkStdio(
        receiverCommandsRead,
        {},
        receiverDataDir,
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toEqual('No notifications to display\n'); // Should be no notifications left
    });
  });
});
