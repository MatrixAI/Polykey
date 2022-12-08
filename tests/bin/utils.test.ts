import type { Host, Port } from '@/network/types';
import ErrorPolykey from '@/ErrorPolykey';
import * as binUtils from '@/bin/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import * as grpcErrors from '@/grpc/errors';
import * as testUtils from '../utils';

describe('bin/utils', () => {
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'list in human and json format',
    () => {
      // List
      expect(
        binUtils.outputFormatter({
          type: 'list',
          data: ['Testing', 'the', 'list', 'output'],
        }),
      ).toBe('Testing\nthe\nlist\noutput\n');
      // JSON
      expect(
        binUtils.outputFormatter({
          type: 'json',
          data: ['Testing', 'the', 'list', 'output'],
        }),
      ).toBe('["Testing","the","list","output"]\n');
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'table in human and in json format',
    () => {
      // Table
      expect(
        binUtils.outputFormatter({
          type: 'table',
          data: [
            { key1: 'value1', key2: 'value2' },
            { key1: 'data1', key2: 'data2' },
            { key1: null, key2: undefined },
          ],
        }),
      ).toBe('key1\tkey2\nvalue1\tvalue2\ndata1\tdata2\n\t\n');
      // JSON
      expect(
        binUtils.outputFormatter({
          type: 'json',
          data: [
            { key1: 'value1', key2: 'value2' },
            { key1: 'data1', key2: 'data2' },
          ],
        }),
      ).toBe(
        '[{"key1":"value1","key2":"value2"},{"key1":"data1","key2":"data2"}]\n',
      );
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'dict in human and in json format',
    () => {
      // Dict
      expect(
        binUtils.outputFormatter({
          type: 'dict',
          data: { key1: 'value1', key2: 'value2' },
        }),
      ).toBe('key1\t"value1"\nkey2\t"value2"\n');
      expect(
        binUtils.outputFormatter({
          type: 'dict',
          data: { key1: 'first\nsecond', key2: 'first\nsecond\n' },
        }),
      ).toBe('key1\t"first\\nsecond"\nkey2\t"first\\nsecond\\n"\n');
      expect(
        binUtils.outputFormatter({
          type: 'dict',
          data: { key1: null, key2: undefined },
        }),
      ).toBe('key1\t""\nkey2\t""\n');
      // JSON
      expect(
        binUtils.outputFormatter({
          type: 'json',
          data: { key1: 'value1', key2: 'value2' },
        }),
      ).toBe('{"key1":"value1","key2":"value2"}\n');
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'errors in human and json format',
    () => {
      const timestamp = new Date();
      const data = { string: 'one', number: 1 };
      const host = '127.0.0.1' as Host;
      const port = 55555 as Port;
      const nodeId = testUtils.generateRandomNodeId();
      const standardError = new TypeError('some error');
      const pkError = new ErrorPolykey<undefined>('some pk error', {
        timestamp,
        data,
      });
      const remoteError = new grpcErrors.ErrorPolykeyRemote<any>(
        {
          nodeId,
          host,
          port,
          command: 'some command',
        },
        'some remote error',
        { timestamp, cause: pkError },
      );
      const twoRemoteErrors = new grpcErrors.ErrorPolykeyRemote<any>(
        {
          nodeId,
          host,
          port,
          command: 'command 2',
        },
        'remote error',
        {
          timestamp,
          cause: new grpcErrors.ErrorPolykeyRemote(
            {
              nodeId,
              host,
              port,
              command: 'command 1',
            },
            undefined,
            {
              timestamp,
              cause: new ErrorPolykey('pk error', {
                timestamp,
                cause: standardError,
              }),
            },
          ),
        },
      );
      // Human
      expect(
        binUtils.outputFormatter({ type: 'error', data: standardError }),
      ).toBe(`${standardError.name}: ${standardError.message}\n`);
      expect(binUtils.outputFormatter({ type: 'error', data: pkError })).toBe(
        `${pkError.name}: ${pkError.description} - ${pkError.message}\n` +
          `  exitCode\t${pkError.exitCode}\n` +
          `  timestamp\t${timestamp.toString()}\n` +
          `  data\t${JSON.stringify(data)}\n`,
      );
      expect(
        binUtils.outputFormatter({ type: 'error', data: remoteError }),
      ).toBe(
        `${remoteError.name}: ${remoteError.description} - ${remoteError.message}\n` +
          `  command\t${remoteError.metadata.command}\n` +
          `  nodeId\t${nodesUtils.encodeNodeId(nodeId)}\n` +
          `  host\t${host}\n` +
          `  port\t${port}\n` +
          `  timestamp\t${timestamp.toString()}\n` +
          `  cause: ${remoteError.cause.name}: ${remoteError.cause.description} - ${remoteError.cause.message}\n` +
          `    exitCode\t${pkError.exitCode}\n` +
          `    timestamp\t${timestamp.toString()}\n` +
          `    data\t${JSON.stringify(data)}\n`,
      );
      expect(
        binUtils.outputFormatter({ type: 'error', data: twoRemoteErrors }),
      ).toBe(
        `${twoRemoteErrors.name}: ${twoRemoteErrors.description} - ${twoRemoteErrors.message}\n` +
          `  command\t${twoRemoteErrors.metadata.command}\n` +
          `  nodeId\t${nodesUtils.encodeNodeId(nodeId)}\n` +
          `  host\t${host}\n` +
          `  port\t${port}\n` +
          `  timestamp\t${timestamp.toString()}\n` +
          `  cause: ${twoRemoteErrors.cause.name}: ${twoRemoteErrors.cause.description}\n` +
          `    command\t${twoRemoteErrors.cause.metadata.command}\n` +
          `    nodeId\t${nodesUtils.encodeNodeId(nodeId)}\n` +
          `    host\t${host}\n` +
          `    port\t${port}\n` +
          `    timestamp\t${timestamp.toString()}\n` +
          `    cause: ${twoRemoteErrors.cause.cause.name}: ${twoRemoteErrors.cause.cause.description} - ${twoRemoteErrors.cause.cause.message}\n` +
          `      exitCode\t${pkError.exitCode}\n` +
          `      timestamp\t${timestamp.toString()}\n` +
          `      cause: ${standardError.name}: ${standardError.message}\n`,
      );
      // JSON
      expect(
        binUtils.outputFormatter({ type: 'json', data: standardError }),
      ).toBe(
        `{"type":"${standardError.name}","data":{"message":"${
          standardError.message
        }","stack":"${standardError.stack?.replaceAll('\n', '\\n')}"}}\n`,
      );
      expect(binUtils.outputFormatter({ type: 'json', data: pkError })).toBe(
        JSON.stringify(pkError.toJSON()) + '\n',
      );
      expect(
        binUtils.outputFormatter({ type: 'json', data: remoteError }),
      ).toBe(JSON.stringify(remoteError.toJSON()) + '\n');
      expect(
        binUtils.outputFormatter({ type: 'json', data: twoRemoteErrors }),
      ).toBe(JSON.stringify(twoRemoteErrors.toJSON()) + '\n');
    },
  );
});
