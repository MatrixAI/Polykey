import { testProp, fc } from '@fast-check/jest';
import * as asymmetric from '@/keys/utils/asymmetric';
import * as ids from '@/ids';
import * as utils from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/asymmetric', () => {
  testProp(
    'encrypt and decrypt - ephemeral static',
    [
      testsKeysUtils.keyPairArb,
      fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
    ],
    (receiverKeyPair, plainText) => {
      const cipherText = asymmetric.encryptWithPublicKey(
        receiverKeyPair.publicKey,
        plainText,
      );
      const plainText_ = asymmetric.decryptWithPrivateKey(
        receiverKeyPair,
        cipherText,
      );
      expect(plainText_).toStrictEqual(plainText);
    },
  );
  testProp(
    'encrypt and decrypt - static static',
    [
      testsKeysUtils.keyPairArb,
      testsKeysUtils.keyPairArb,
      fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
    ],
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
  testProp(
    'decrypt returns `undefined` for random data',
    [
      testsKeysUtils.keyPairArb,
      testsKeysUtils.keyPairArb,
      fc.uint8Array({ minLength: 0, maxLength: 2048 }).map(utils.bufferWrap),
    ],
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
  testProp(
    'sign and verify',
    [
      testsKeysUtils.keyPairArb,
      testsKeysUtils.keyPairArb,
      fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
    ],
    (keyPairCorrect, keyPairWrong, message) => {
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
    },
  );
  testProp(
    'verify returns `false` for random data',
    [
      testsKeysUtils.publicKeyArb,
      fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
      fc.uint8Array({ minLength: 0, maxLength: 2048 }).map(utils.bufferWrap),
    ],
    (publicKey, signature, message) => {
      const verified = asymmetric.verifyWithPublicKey(
        publicKey,
        message,
        signature,
      );
      expect(verified).toBe(false);
    },
  );
  testProp(
    'signatures are deterministic',
    [
      testsKeysUtils.keyPairArb,
      fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(utils.bufferWrap),
    ],
    (keyPair, message) => {
      const signature1 = asymmetric.signWithPrivateKey(
        keyPair.privateKey,
        message,
      );
      const signature2 = asymmetric.signWithPrivateKey(
        keyPair.privateKey,
        message,
      );
      expect(signature1).toStrictEqual(signature2);
    },
  );
  testProp(
    'public keys are node IDs',
    [testsKeysUtils.publicKeyArb],
    (publicKey) => {
      const nodeId = asymmetric.publicKeyToNodeId(publicKey);
      const nodeIdEncoded = ids.encodeNodeId(nodeId);
      const nodeId_ = ids.decodeNodeId(nodeIdEncoded);
      expect(nodeId).toStrictEqual(nodeId_);
      const publicKey_ = asymmetric.publicKeyFromNodeId(nodeId);
      expect(publicKey).toStrictEqual(publicKey_);
    },
  );
  testProp(
    'encapsulate & decapsulate keys - ephemeral static',
    [testsKeysUtils.keyPairArb, testsKeysUtils.keyJWKArb],
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
  testProp(
    'encapsulate & decapsulate keys - static static',
    [
      testsKeysUtils.keyPairArb,
      testsKeysUtils.keyPairArb,
      testsKeysUtils.keyJWKArb,
    ],
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
