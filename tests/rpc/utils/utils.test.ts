import { testProp } from '@fast-check/jest';
import * as rpcUtils from '@/rpc/utils';
import 'ix/add/asynciterable-operators/toarray';
import * as rpcTestUtils from '../utils';

describe('utils tests', () => {
  testProp(
    'can parse messages',
    [rpcTestUtils.jsonRpcMessageArb()],
    async (message) => {
      rpcUtils.parseJSONRPCMessage(message);
    },
    { numRuns: 1000 },
  );
  // TODO:
  //  - Test for badly structured data
});
