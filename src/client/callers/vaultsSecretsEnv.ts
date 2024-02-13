import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsEnv from '../handlers/VaultsSecretsEnv';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsEnv>;

const vaultsSecretsEnv = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsEnv;
