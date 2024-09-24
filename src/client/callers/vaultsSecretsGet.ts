import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsGet from '../handlers/VaultsSecretsGet';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsGet>;

const vaultsSecretsGet = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsGet;
