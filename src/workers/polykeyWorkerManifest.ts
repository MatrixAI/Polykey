import type { WorkerManifest } from '@matrixai/workers';
import type {
  Key,
  KeyPair,
  PrivateKey,
  RecoveryCode,
  PasswordHash,
  PasswordSalt,
  PasswordMemLimit,
  PasswordOpsLimit,
  CertId,
} from '../keys/types.js';
import { expose } from '@matrixai/workers';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from '../keys/utils/index.js';

type PolykeyWorkerManifest = {
  sleep({ delay }: { delay: number }): Promise<{ data: undefined }>;
  hashPassword(
    {
      password,
      salt,
      opsLimit,
      memLimit,
    }: {
      password: string;
      salt?: ArrayBuffer;
      opsLimit?: PasswordOpsLimit;
      memLimit?: PasswordMemLimit;
    },
    transferList?: Array<ArrayBuffer>,
  ): Promise<{
    data: [ArrayBuffer, ArrayBuffer];
    transferList: [ArrayBuffer, ArrayBuffer];
  }>;
  checkPassword(
    {
      password,
      hash,
      salt,
      opsLimit,
      memLimit,
    }: {
      password: string;
      hash: ArrayBuffer;
      salt: ArrayBuffer;
      opsLimit?: PasswordOpsLimit;
      memLimit?: PasswordMemLimit;
    },
    transferList?: Array<ArrayBuffer>,
  ): Promise<{ data: boolean }>;
  generateDeterministicKeyPair({
    recoveryCode,
  }: {
    recoveryCode: RecoveryCode;
  }): Promise<{
    data: {
      publicKey: ArrayBuffer;
      privateKey: ArrayBuffer;
      secretKey: ArrayBuffer;
    };
    transferList: [ArrayBuffer, ArrayBuffer, ArrayBuffer];
  }>;
  generateCertificate(
    {
      certId,
      subjectKeyPair,
      issuerPrivateKey,
      duration,
      subjectAttrsExtra,
      issuerAttrsExtra,
      now,
    }: {
      certId: ArrayBuffer;
      subjectKeyPair: {
        publicKey: ArrayBuffer;
        privateKey: ArrayBuffer;
      };
      issuerPrivateKey: ArrayBuffer;
      duration: number;
      subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
      issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>;
      now?: Date;
    },
    transferList?: Array<ArrayBuffer>,
  ): Promise<{
    data: ArrayBuffer;
    transferList: [ArrayBuffer];
  }>;
  encrypt(
    data: { key: ArrayBuffer; plainText: ArrayBuffer },
    transferList: Array<ArrayBuffer>,
  ): Promise<{ data: ArrayBuffer; transferList: [ArrayBuffer] }>;
  decrypt(
    data: {
      key: ArrayBuffer;
      cipherText: ArrayBuffer;
    },
    transferList: Array<ArrayBuffer>,
  ): Promise<
    | { data: ArrayBuffer; transferList: [ArrayBuffer] }
    | { data: undefined; transferList: [] }
  >;
};

/**
 * Worker object that contains all functions that will be executed in parallel.
 * Functions should be using CPU-parallelism not IO-parallelism.
 * Most functions should be synchronous, not asynchronous.
 * Making them asynchronous does not make a difference to the caller.
 * The caller must always await because the fucntions will run on the pool.
 *
 * When passing in `Buffer`, it is coerced into an `Uint8Array`. To avoid
 * confusion, do not pass in `Buffer` and instead use `ArrayBuffer`.
 *
 * If you are passing the underlying `ArrayBuffer`, ensure that the containing
 * `Buffer` is unpooled, or make a slice copy of the underlying `ArrayBuffer`
 * with the `Buffer.byteOffset` and `Buffer.byteLength`.
 *
 * Remember the subtyping relationship of buffers:
 * Buffers < Uint8Array < ArrayBuffer < BufferSource
 *
 * Only the `ArrayBuffer` is "transferrable" which means they can be zero-copy
 * transferred. When transferring a structure that contains `ArrayBuffer`, you
 * must pass the array of transferrable objects as the second parameter to
 * `Transfer`.
 *
 * Only transfer things that you don't expect to be using in the sending thread.
 *
 * Note that `Buffer.from(ArrayBuffer)` is a zero-copy wrapper.
 */
const polykeyWorkerManifest: PolykeyWorkerManifest = {
  async sleep({ delay }: { delay: number }): Promise<{ data: undefined }> {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return { data: undefined };
  },
  // Keys functions
  async hashPassword(
    {
      password,
      salt,
      opsLimit,
      memLimit,
    }: {
      password: string;
      salt?: ArrayBuffer;
      opsLimit?: PasswordOpsLimit;
      memLimit?: PasswordMemLimit;
    },
    transferList?: Array<ArrayBuffer>, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{
    data: [ArrayBuffer, ArrayBuffer];
    transferList: [ArrayBuffer, ArrayBuffer];
  }> {
    if (salt != null) salt = Buffer.from(salt);
    // It is guaranteed that `keysUtils.hashPassword` returns non-pooled buffers
    const hashAndSalt = keysUtils.hashPassword(
      password,
      salt as PasswordSalt | undefined,
      opsLimit,
      memLimit,
    );
    // Result is a tuple of [hash, salt] using transferable `ArrayBuffer`
    const result: [ArrayBuffer, ArrayBuffer] = [
      hashAndSalt[0].buffer,
      hashAndSalt[1].buffer,
    ];
    return { data: result, transferList: result };
  },
  async checkPassword(
    {
      password,
      hash,
      salt,
      opsLimit,
      memLimit,
    }: {
      password: string;
      hash: ArrayBuffer;
      salt: ArrayBuffer;
      opsLimit?: PasswordOpsLimit;
      memLimit?: PasswordMemLimit;
    },
    transferList: Array<ArrayBuffer>, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ data: boolean }> {
    hash = Buffer.from(hash);
    salt = Buffer.from(salt);
    const result = keysUtils.checkPassword(
      password,
      hash as PasswordHash,
      salt as PasswordSalt,
      opsLimit,
      memLimit,
    );
    return { data: result };
  },
  async generateDeterministicKeyPair({
    recoveryCode,
  }: {
    recoveryCode: RecoveryCode;
  }): Promise<{
    data: {
      publicKey: ArrayBuffer;
      privateKey: ArrayBuffer;
      secretKey: ArrayBuffer;
    };
    transferList: [ArrayBuffer, ArrayBuffer, ArrayBuffer];
  }> {
    const keyPair = await keysUtils.generateDeterministicKeyPair(recoveryCode);
    // Result is a record of {publicKey, privateKey, secretKey} using transferable `ArrayBuffer`
    const result = {
      publicKey: keyPair.publicKey.buffer,
      privateKey: keyPair.privateKey.buffer,
      secretKey: keyPair.secretKey.buffer,
    };
    return {
      data: {
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        secretKey: result.secretKey,
      },
      transferList: [result.publicKey, result.privateKey, result.secretKey],
    };
  },
  async generateCertificate({
    certId,
    subjectKeyPair,
    issuerPrivateKey,
    duration,
    subjectAttrsExtra,
    issuerAttrsExtra,
    now = new Date(),
  }: {
    certId: ArrayBuffer;
    subjectKeyPair: {
      publicKey: ArrayBuffer;
      privateKey: ArrayBuffer;
    };
    issuerPrivateKey: ArrayBuffer;
    duration: number;
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    now?: Date;
  }): Promise<{
    data: ArrayBuffer;
    transferList: [ArrayBuffer];
  }> {
    certId = IdInternal.create<CertId>(certId);
    subjectKeyPair.publicKey = Buffer.from(subjectKeyPair.publicKey);
    subjectKeyPair.privateKey = Buffer.from(subjectKeyPair.privateKey);
    issuerPrivateKey = Buffer.from(issuerPrivateKey);
    const cert = await keysUtils.generateCertificate({
      certId: certId as CertId,
      subjectKeyPair: subjectKeyPair as KeyPair,
      issuerPrivateKey: issuerPrivateKey as PrivateKey,
      duration,
      subjectAttrsExtra,
      issuerAttrsExtra,
      now,
    });
    return { data: cert.rawData, transferList: [cert.rawData] };
  },

  // EFS functions

  async encrypt({
    key,
    plainText,
  }: {
    key: ArrayBuffer;
    plainText: ArrayBuffer;
  }): Promise<{ data: ArrayBuffer; transferList: [ArrayBuffer] }> {
    const cipherText = keysUtils.encryptWithKey(
      Buffer.from(key) as Key,
      Buffer.from(plainText),
    );
    const cipherTextAB = cipherText.buffer;
    return { data: cipherTextAB, transferList: [cipherTextAB] };
  },
  async decrypt({
    key,
    cipherText,
  }: {
    key: ArrayBuffer;
    cipherText: ArrayBuffer;
  }): Promise<
    | { data: ArrayBuffer; transferList: [ArrayBuffer] }
    | { data: undefined; transferList: [] }
  > {
    const plainText = keysUtils.decryptWithKey(
      Buffer.from(key) as Key,
      Buffer.from(cipherText),
    );
    if (plainText != null) {
      const plainTextAB = plainText.buffer;
      return { data: plainTextAB, transferList: [plainTextAB] };
    } else {
      return { data: undefined, transferList: [] };
    }
  },
} satisfies WorkerManifest;

expose(polykeyWorkerManifest);

export type { PolykeyWorkerManifest };

export default polykeyWorkerManifest;
