import { ErrorPolykey } from '../errors';

class ErrorKeys extends ErrorPolykey {}

class ErrorKeyManagerRunning extends ErrorKeys {}

class ErrorKeyManagerNotRunning extends ErrorKeys {}

class ErrorKeyManagerDestroyed extends ErrorKeys {}

class ErrorRootKeysRead extends ErrorKeys {}

class ErrorRootKeysParse extends ErrorKeys {}

class ErrorRootKeysWrite extends ErrorKeys {}

class ErrorRootCertRead extends ErrorKeys {}

class ErrorRootCertWrite extends ErrorKeys {}

class ErrorRootCertRenew extends ErrorKeys {}

class ErrorRootCertsGC extends ErrorKeys {}

class ErrorEncryptSize extends ErrorKeys {}

class ErrorDBKeyRead extends ErrorKeys {}

class ErrorDBKeyWrite extends ErrorKeys {}

class ErrorDBKeyParse extends ErrorKeys {}

export {
  ErrorKeys,
  ErrorKeyManagerRunning,
  ErrorKeyManagerNotRunning,
  ErrorKeyManagerDestroyed,
  ErrorRootKeysRead,
  ErrorRootKeysParse,
  ErrorRootKeysWrite,
  ErrorRootCertRead,
  ErrorRootCertWrite,
  ErrorRootCertRenew,
  ErrorRootCertsGC,
  ErrorEncryptSize,
  ErrorDBKeyRead,
  ErrorDBKeyWrite,
  ErrorDBKeyParse,
};
