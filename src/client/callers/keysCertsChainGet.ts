import type { HandlerTypes } from '@matrixai/rpc';
import type KeysCertsChainGet from '../handlers/KeysCertsChainGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysCertsChainGet>;

const keysCertsChainGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysCertsChainGet;
