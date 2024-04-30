import { test, fc } from '@fast-check/jest';
import * as asymmetric from '@/keys/utils/asymmetric';
import * as ids from '@/ids';
import * as utils from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/asymmetric', () => {
  test.prop([
    testsKeysUtils.keyPairArb,
    fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
  ])('encrypt and decrypt - ephemeral static', (receiverKeyPair, plainText) => {
    const cipherText = asymmetric.encryptWithPublicKey(
      receiverKeyPair.publicKey,
      plainText,
    );
    const plainText_ = asymmetric.decryptWithPrivateKey(
      receiverKeyPair,
      cipherText,
    );
    expect(plainText_).toStrictEqual(plainText);
  });
  test.prop([
    testsKeysUtils.keyPairArb,
    testsKeysUtils.keyPairArb,
    fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
  ])(
    'encrypt and decrypt - static static',
    (senderKeyPair, receiverKeyPair, plainText) => {
      const cipherText = asymmetric.encryptWithPublicKey(
        receiverKeyPair.publicKey,
        plainText,
        senderKeyPair,
      );
      const plainText_ = asymmetric.decryptWithPrivateKey(
        receiverKeyPair,
        cipherText,
        senderKeyPair.publicKey,
      );
      expect(plainText_).toStrictEqual(plainText);
    },
  );
  test.prop([
    testsKeysUtils.keyPairArb,
    testsKeysUtils.keyPairArb,
    fc.uint8Array({ minLength: 0, maxLength: 2048 }).map(utils.bufferWrap),
  ])(
    'decrypt returns `undefined` for random data',
    (senderKeyPair, receiverKeyPair, cipherText) => {
      const plainText1 = asymmetric.decryptWithPrivateKey(
        receiverKeyPair,
        cipherText,
        senderKeyPair.publicKey,
      );
      expect(plainText1).toBeUndefined();
      const plainText2 = asymmetric.decryptWithPrivateKey(
        receiverKeyPair,
        cipherText,
      );
      expect(plainText2).toBeUndefined();
    },
  );
  test.prop([
    testsKeysUtils.keyPairArb,
    testsKeysUtils.keyPairArb,
    fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
  ])('sign and verify', (keyPairCorrect, keyPairWrong, message) => {
    const signature = asymmetric.signWithPrivateKey(
      keyPairCorrect.privateKey,
      message,
    );
    let verified: boolean;
    verified = asymmetric.verifyWithPublicKey(
      keyPairCorrect.publicKey,
      message,
      signature,
    );
    expect(verified).toBe(true);
    verified = asymmetric.verifyWithPublicKey(
      keyPairWrong.publicKey,
      message,
      signature,
    );
    expect(verified).toBe(false);
  });
  test.prop([
    testsKeysUtils.publicKeyArb,
    fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
    fc.uint8Array({ minLength: 0, maxLength: 2048 }).map(utils.bufferWrap),
  ])(
    'verify returns `false` for random data',
    (publicKey, signature, message) => {
      const verified = asymmetric.verifyWithPublicKey(
        publicKey,
        message,
        signature,
      );
      expect(verified).toBe(false);
    },
  );
  test.prop([
    testsKeysUtils.keyPairArb,
    fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
  ])('signatures are deterministic', (keyPair, message) => {
    const signature1 = asymmetric.signWithPrivateKey(
      keyPair.privateKey,
      message,
    );
    const signature2 = asymmetric.signWithPrivateKey(
      keyPair.privateKey,
      message,
    );
    expect(signature1).toStrictEqual(signature2);
  });
  test.prop([testsKeysUtils.publicKeyArb])(
    'public keys are node IDs',
    (publicKey) => {
      const nodeId = asymmetric.publicKeyToNodeId(publicKey);
      const nodeIdEncoded = ids.encodeNodeId(nodeId);
      const nodeId_ = ids.decodeNodeId(nodeIdEncoded);
      expect(nodeId).toStrictEqual(nodeId_);
      const publicKey_ = asymmetric.publicKeyFromNodeId(nodeId);
      expect(publicKey).toStrictEqual(publicKey_);
    },
  );
  test.prop([testsKeysUtils.keyPairArb, testsKeysUtils.keyJWKArb])(
    'encapsulate & decapsulate keys - ephemeral static',
    (receiverKeyPair, keyJWK) => {
      const encapsulatedKey = asymmetric.encapsulateWithPublicKey(
        receiverKeyPair.publicKey,
        keyJWK,
      );
      const keyJWK_ = asymmetric.decapsulateWithPrivateKey(
        receiverKeyPair,
        encapsulatedKey,
      );
      expect(keyJWK_).toStrictEqual(keyJWK);
    },
  );
  test.prop([
    testsKeysUtils.keyPairArb,
    testsKeysUtils.keyPairArb,
    testsKeysUtils.keyJWKArb,
  ])(
    'encapsulate & decapsulate keys - static static',
    (senderKeyPair, receiverKeyPair, keyJWK) => {
      const encapsulatedKey = asymmetric.encapsulateWithPublicKey(
        receiverKeyPair.publicKey,
        keyJWK,
        senderKeyPair,
      );
      const keyJWK_ = asymmetric.decapsulateWithPrivateKey(
        receiverKeyPair,
        encapsulatedKey,
        senderKeyPair.publicKey,
      );
      expect(keyJWK_).toStrictEqual(keyJWK);
    },
  );
});
