import type { HandlerTypes } from '@matrixai/rpc';
import type AuthIdentityToken from '../handlers/AuthIdentityToken.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AuthIdentityToken>;

const authIdentityToken = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default authIdentityToken;
