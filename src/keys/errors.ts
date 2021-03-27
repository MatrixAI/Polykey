import { ErrorPolykey } from '../errors';

class ErrorKeys extends ErrorPolykey {}

class ErrorRootKeysRead extends ErrorKeys {}

class ErrorRootKeysParse extends ErrorKeys {}

class ErrorRootKeysWrite extends ErrorKeys {}

class ErrorRootKeysUndefined extends ErrorKeys {}

class ErrorRootCertRead extends ErrorKeys {}

class ErrorRootCertWrite extends ErrorKeys {}

class ErrorRootCertUndefined extends ErrorKeys {}

class ErrorRootCertRenew extends ErrorKeys {}

class ErrorRootCertsGC extends ErrorKeys {}

class ErrorEncryptSize extends ErrorKeys {}

export {
  ErrorKeys,
  ErrorRootKeysRead,
  ErrorRootKeysParse,
  ErrorRootKeysWrite,
  ErrorRootKeysUndefined,
  ErrorRootCertRead,
  ErrorRootCertWrite,
  ErrorRootCertUndefined,
  ErrorRootCertRenew,
  ErrorRootCertsGC,
  ErrorEncryptSize,
};
