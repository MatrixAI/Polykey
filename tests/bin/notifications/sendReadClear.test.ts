import type { NodeId } from '@/ids/types';
import type { Host, Port } from '@/network/types';
import type { Notification } from '@/notifications/types';
import type { StatusLive } from '@/status/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as nodesUtils from '@/nodes/utils';
import * as testUtils from '../../utils';

describe('send/read/claim', () => {
  const logger = new Logger('send/read/clear test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let senderId: NodeId;
  let senderHost: Host;
  let senderPort: Port;
  let receiverId: NodeId;
  let receiverHost: Host;
  let receiverPort: Port;
  let senderAgentStatus: StatusLive;
  let senderAgentClose: () => Promise<void>;
  let senderAgentDir: string;
  let senderAgentPassword: string;
  let receiverAgentStatus: StatusLive;
  let receiverAgentClose: () => Promise<void>;
  let receiverAgentDir: string;
  let receiverAgentPassword: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    // Cannot use the shared global agent since we can't 'un-add' a node
    // which we need in order to trust it and send notifications to it
    ({
      agentStatus: senderAgentStatus,
      agentClose: senderAgentClose,
      agentDir: senderAgentDir,
      agentPassword: senderAgentPassword,
    } = await testUtils.setupTestAgent(logger));
    senderId = senderAgentStatus.data.nodeId;
    senderHost = senderAgentStatus.data.proxyHost;
    senderPort = senderAgentStatus.data.proxyPort;
    ({
      agentStatus: receiverAgentStatus,
      agentClose: receiverAgentClose,
      agentDir: receiverAgentDir,
      agentPassword: receiverAgentPassword,
    } = await testUtils.setupTestAgent(logger));
    receiverId = receiverAgentStatus.data.nodeId;
    receiverHost = receiverAgentStatus.data.proxyHost;
    receiverPort = receiverAgentStatus.data.proxyPort;
  });
  afterEach(async () => {
    await receiverAgentClose();
    await senderAgentClose();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )(
    'sends, receives, and clears notifications',
    async () => {
      let exitCode, stdout;
      let readNotifications: Array<Notification>;
      // Add receiver to sender's node graph so it can be contacted
      ({ exitCode } = await testUtils.pkExec(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(receiverId),
          receiverHost,
          receiverPort.toString(),
        ],
        {
          env: {
            PK_NODE_PATH: senderAgentDir,
            PK_PASSWORD: senderAgentPassword,
          },
          cwd: senderAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      // Add sender to receiver's node graph so it can be trusted
      ({ exitCode } = await testUtils.pkExec(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(senderId),
          senderHost,
          senderPort.toString(),
        ],
        {
          env: {
            PK_NODE_PATH: receiverAgentDir,
            PK_PASSWORD: receiverAgentPassword,
          },
          cwd: receiverAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      // Trust sender so notification can be received
      ({ exitCode } = await testUtils.pkExec(
        ['identities', 'trust', nodesUtils.encodeNodeId(senderId)],
        {
          env: {
            PK_NODE_PATH: receiverAgentDir,
            PK_PASSWORD: receiverAgentPassword,
          },
          cwd: receiverAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      // Send some notifications
      ({ exitCode } = await testUtils.pkExec(
        [
          'notifications',
          'send',
          nodesUtils.encodeNodeId(receiverId),
          'test message 1',
        ],
        {
          env: {
            PK_NODE_PATH: senderAgentDir,
            PK_PASSWORD: senderAgentPassword,
          },
          cwd: senderAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      ({ exitCode } = await testUtils.pkExec(
        [
          'notifications',
          'send',
          nodesUtils.encodeNodeId(receiverId),
          'test message 2',
        ],
        {
          env: {
            PK_NODE_PATH: senderAgentDir,
            PK_PASSWORD: senderAgentPassword,
          },
          cwd: senderAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      ({ exitCode } = await testUtils.pkExec(
        [
          'notifications',
          'send',
          nodesUtils.encodeNodeId(receiverId),
          'test message 3',
        ],
        {
          env: {
            PK_NODE_PATH: senderAgentDir,
            PK_PASSWORD: senderAgentPassword,
          },
          cwd: senderAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      // Read notifications
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['notifications', 'read', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: receiverAgentDir,
            PK_PASSWORD: receiverAgentPassword,
          },
          cwd: receiverAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      readNotifications = stdout
        .split('\n')
        .slice(undefined, -1)
        .map(JSON.parse);
      expect(readNotifications).toHaveLength(3);
      expect(readNotifications[0]).toMatchObject({
        data: {
          type: 'General',
          message: 'test message 3',
        },
        senderId: nodesUtils.encodeNodeId(senderId),
        isRead: true,
      });
      expect(readNotifications[1]).toMatchObject({
        data: {
          type: 'General',
          message: 'test message 2',
        },
        senderId: nodesUtils.encodeNodeId(senderId),
        isRead: true,
      });
      expect(readNotifications[2]).toMatchObject({
        data: {
          type: 'General',
          message: 'test message 1',
        },
        senderId: nodesUtils.encodeNodeId(senderId),
        isRead: true,
      });
      // Read only unread (none)
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['notifications', 'read', '--unread', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: receiverAgentDir,
            PK_PASSWORD: receiverAgentPassword,
          },
          cwd: receiverAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      readNotifications = stdout
        .split('\n')
        .slice(undefined, -1)
        .map(JSON.parse);
      expect(readNotifications).toHaveLength(0);
      // Read notifications on reverse order
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['notifications', 'read', '--order=oldest', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: receiverAgentDir,
            PK_PASSWORD: receiverAgentPassword,
          },
          cwd: receiverAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      readNotifications = stdout
        .split('\n')
        .slice(undefined, -1)
        .map(JSON.parse);
      expect(readNotifications).toHaveLength(3);
      expect(readNotifications[0]).toMatchObject({
        data: {
          type: 'General',
          message: 'test message 1',
        },
        senderId: nodesUtils.encodeNodeId(senderId),
        isRead: true,
      });
      expect(readNotifications[1]).toMatchObject({
        data: {
          type: 'General',
          message: 'test message 2',
        },
        senderId: nodesUtils.encodeNodeId(senderId),
        isRead: true,
      });
      expect(readNotifications[2]).toMatchObject({
        data: {
          type: 'General',
          message: 'test message 3',
        },
        senderId: nodesUtils.encodeNodeId(senderId),
        isRead: true,
      });
      // Read only one notification
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['notifications', 'read', '--number=1', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: receiverAgentDir,
            PK_PASSWORD: receiverAgentPassword,
          },
          cwd: receiverAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      readNotifications = stdout
        .split('\n')
        .slice(undefined, -1)
        .map(JSON.parse);
      expect(readNotifications).toHaveLength(1);
      expect(readNotifications[0]).toMatchObject({
        data: {
          type: 'General',
          message: 'test message 3',
        },
        senderId: nodesUtils.encodeNodeId(senderId),
        isRead: true,
      });
      // Clear notifications
      ({ exitCode } = await testUtils.pkExec(['notifications', 'clear'], {
        env: {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        cwd: receiverAgentDir,
        command: globalThis.testCmd,
      }));
      // Check there are no more notifications
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['notifications', 'read', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: receiverAgentDir,
            PK_PASSWORD: receiverAgentPassword,
          },
          cwd: receiverAgentDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      readNotifications = stdout
        .split('\n')
        .slice(undefined, -1)
        .map(JSON.parse);
      expect(readNotifications).toHaveLength(0);
    },
    globalThis.defaultTimeout * 3,
  );
});
