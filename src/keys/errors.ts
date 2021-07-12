import { ErrorPolykey } from '../errors';

class ErrorKeys extends ErrorPolykey {}

class ErrorKeyManagerNotStarted extends ErrorKeys {}

class ErrorRootKeysRead extends ErrorKeys {}

class ErrorRootKeysParse extends ErrorKeys {}

class ErrorRootKeysWrite extends ErrorKeys {}

class ErrorRootCertRead extends ErrorKeys {}

class ErrorRootCertWrite extends ErrorKeys {}

class ErrorRootCertRenew extends ErrorKeys {}

class ErrorRootCertsGC extends ErrorKeys {}

class ErrorEncryptSize extends ErrorKeys {}

export {
  ErrorKeys,
  ErrorKeyManagerNotStarted,
  ErrorRootKeysRead,
  ErrorRootKeysParse,
  ErrorRootKeysWrite,
  ErrorRootCertRead,
  ErrorRootCertWrite,
  ErrorRootCertRenew,
  ErrorRootCertsGC,
  ErrorEncryptSize,
};
