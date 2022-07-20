import type { NodeId } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type { Notification } from '@/notifications/types';
import type { StatusLive } from '@/status/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as nodesUtils from '@/nodes/utils';
import * as testBinUtils from '../utils';
import { globalRootKeyPems } from '../../globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

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
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    // Cannot use the shared global agent since we can't 'un-add' a node
    // which we need in order to trust it and send notifications to it
    ({
      agentStatus: senderAgentStatus,
      agentClose: senderAgentClose,
      agentDir: senderAgentDir,
      agentPassword: senderAgentPassword,
    } = await testBinUtils.setupTestAgent(
      global.testCmd,
      globalRootKeyPems[0],
      logger,
    ));
    senderId = senderAgentStatus.data.nodeId;
    senderHost = senderAgentStatus.data.proxyHost;
    senderPort = senderAgentStatus.data.proxyPort;
    ({
      agentStatus: receiverAgentStatus,
      agentClose: receiverAgentClose,
      agentDir: receiverAgentDir,
      agentPassword: receiverAgentPassword,
    } = await testBinUtils.setupTestAgent(
      global.testCmd,
      globalRootKeyPems[1],
      logger,
    ));
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
  runTestIfPlatforms('linux', 'docker')(
    'sends, receives, and clears notifications',
    async () => {
      let exitCode, stdout;
      let readNotifications: Array<Notification>;
      // Add receiver to sender's node graph so it can be contacted
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(receiverId),
          receiverHost,
          receiverPort.toString(),
        ],
        {
          PK_NODE_PATH: senderAgentDir,
          PK_PASSWORD: senderAgentPassword,
        },
        senderAgentDir,
      ));
      expect(exitCode).toBe(0);
      // Add sender to receiver's node graph so it can be trusted
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(senderId),
          senderHost,
          senderPort.toString(),
        ],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
      ));
      expect(exitCode).toBe(0);
      // Trust sender so notification can be received
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['identities', 'trust', nodesUtils.encodeNodeId(senderId)],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
      ));
      expect(exitCode).toBe(0);
      // Send some notifications
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        [
          'notifications',
          'send',
          nodesUtils.encodeNodeId(receiverId),
          'test message 1',
        ],
        {
          PK_NODE_PATH: senderAgentDir,
          PK_PASSWORD: senderAgentPassword,
        },
        senderAgentDir,
      ));
      expect(exitCode).toBe(0);
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        [
          'notifications',
          'send',
          nodesUtils.encodeNodeId(receiverId),
          'test message 2',
        ],
        {
          PK_NODE_PATH: senderAgentDir,
          PK_PASSWORD: senderAgentPassword,
        },
        senderAgentDir,
      ));
      expect(exitCode).toBe(0);
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        [
          'notifications',
          'send',
          nodesUtils.encodeNodeId(receiverId),
          'test message 3',
        ],
        {
          PK_NODE_PATH: senderAgentDir,
          PK_PASSWORD: senderAgentPassword,
        },
        senderAgentDir,
      ));
      expect(exitCode).toBe(0);
      // Read notifications
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['notifications', 'read', '--format', 'json'],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
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
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['notifications', 'read', '--unread', '--format', 'json'],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
      ));
      expect(exitCode).toBe(0);
      readNotifications = stdout
        .split('\n')
        .slice(undefined, -1)
        .map(JSON.parse);
      expect(readNotifications).toHaveLength(0);
      // Read notifications on reverse order
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['notifications', 'read', '--order=oldest', '--format', 'json'],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
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
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['notifications', 'read', '--number=1', '--format', 'json'],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
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
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['notifications', 'clear'],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
      ));
      // Check there are no more notifications
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['notifications', 'read', '--format', 'json'],
        {
          PK_NODE_PATH: receiverAgentDir,
          PK_PASSWORD: receiverAgentPassword,
        },
        receiverAgentDir,
      ));
      expect(exitCode).toBe(0);
      readNotifications = stdout
        .split('\n')
        .slice(undefined, -1)
        .map(JSON.parse);
      expect(readNotifications).toHaveLength(0);
    },
    global.defaultTimeout * 2,
  );
});
