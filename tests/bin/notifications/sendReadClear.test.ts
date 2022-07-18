import type { NodeId } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type { Notification } from '@/notifications/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as testBinUtils from '../utils';
import { globalRootKeyPems } from '../../globalRootKeyPems';

describe('send/read/claim', () => {
  const logger = new Logger('send/read/clear test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  let dataDir: string;
  let nodePathSender: string;
  let nodePathReceiver: string;
  let sender: PolykeyAgent;
  let senderId: NodeId;
  let senderHost: Host;
  let senderPort: Port;
  let receiver: PolykeyAgent;
  let receiverId: NodeId;
  let receiverHost: Host;
  let receiverPort: Port;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePathSender = path.join(dataDir, 'sender');
    nodePathReceiver = path.join(dataDir, 'receiver');
    // Cannot use the shared global agent since we can't 'un-add' a node
    // which we need in order to trust it and send notifications to it
    sender = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePathSender,
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      logger,
    });
    senderId = sender.keyManager.getNodeId();
    senderHost = sender.proxy.getProxyHost();
    senderPort = sender.proxy.getProxyPort();
    receiver = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePathReceiver,
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[1],
      },
      logger,
    });
    receiverId = receiver.keyManager.getNodeId();
    receiverHost = receiver.proxy.getProxyHost();
    receiverPort = receiver.proxy.getProxyPort();
  });
  afterEach(async () => {
    await receiver.stop();
    await sender.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('sends, receives, and clears notifications', async () => {
    let exitCode, stdout;
    let readNotifications: Array<Notification>;
    // Add receiver to sender's node graph so it can be contacted
    ({ exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(receiverId),
        receiverHost,
        receiverPort.toString(),
      ],
      {
        PK_NODE_PATH: nodePathSender,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    // Add sender to receiver's node graph so it can be trusted
    ({ exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(senderId),
        senderHost,
        senderPort.toString(),
      ],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    // Trust sender so notification can be received
    ({ exitCode } = await testBinUtils.pkStdio(
      ['identities', 'trust', nodesUtils.encodeNodeId(senderId)],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    // Send some notifications
    ({ exitCode } = await testBinUtils.pkStdio(
      [
        'notifications',
        'send',
        nodesUtils.encodeNodeId(receiverId),
        'test message 1',
      ],
      {
        PK_NODE_PATH: nodePathSender,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    ({ exitCode } = await testBinUtils.pkStdio(
      [
        'notifications',
        'send',
        nodesUtils.encodeNodeId(receiverId),
        'test message 2',
      ],
      {
        PK_NODE_PATH: nodePathSender,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    ({ exitCode } = await testBinUtils.pkStdio(
      [
        'notifications',
        'send',
        nodesUtils.encodeNodeId(receiverId),
        'test message 3',
      ],
      {
        PK_NODE_PATH: nodePathSender,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    // Read notifications
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['notifications', 'read', '--format', 'json'],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    readNotifications = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
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
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['notifications', 'read', '--unread', '--format', 'json'],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    readNotifications = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(readNotifications).toHaveLength(0);
    // Read notifications on reverse order
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['notifications', 'read', '--order=oldest', '--format', 'json'],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    readNotifications = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
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
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['notifications', 'read', '--number=1', '--format', 'json'],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    readNotifications = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
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
    ({ exitCode } = await testBinUtils.pkStdio(
      ['notifications', 'clear'],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    // Check there are no more notifications
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['notifications', 'read', '--format', 'json'],
      {
        PK_NODE_PATH: nodePathReceiver,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    readNotifications = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(readNotifications).toHaveLength(0);
  });
});
