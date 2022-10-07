import { testProp, fc } from '@fast-check/jest';
import * as nobleEd25519 from '@noble/ed25519';
import * as generate from '@/keys/utils/generate';
import * as asymmetric from '@/keys/utils/asymmetric';
import * as ids from '@/ids';
import { bufferWrap } from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/asymmetric', () => {
  test('ed25519 keypair to x25519 keypair', async () => {
    // Here we test equivalence between our functions and upstream libraries
    // This is in-order to sanity check our transformations are correct
    const keyPair = await generate.generateKeyPair();
    // 2 ways of getting the x25519 public key:
    // 1. ed25519 public key to x25519 public key
    // 2. ed25519 private key to x25519 public key
    const publicKeyX25519a = nobleEd25519.Point.fromHex(
      keyPair.publicKey,
    ).toX25519();
    const publicKeyX25519b = (
      await nobleEd25519.Point.fromPrivateKey(keyPair.privateKey)
    ).toX25519();
    expect(publicKeyX25519a).toStrictEqual(publicKeyX25519b);
    // Convert ed25519 private key to x25519 private key
    const privateKeyX25519 = (
      await nobleEd25519.utils.getExtendedPublicKey(keyPair.privateKey)
    ).head;
    // Convert x25519 private key to x25519 public key
    const publicKeyX25519c =
      nobleEd25519.curve25519.scalarMultBase(privateKeyX25519);
    expect(publicKeyX25519c).toStrictEqual(publicKeyX25519a);
    // Key exchange from ed25519 keys
    const sharedSecret1 = await nobleEd25519.getSharedSecret(
      keyPair.privateKey,
      keyPair.publicKey,
    );
    // Key exchange from equivalent x25519 keys
    const sharedSecret2 = nobleEd25519.curve25519.scalarMult(
      privateKeyX25519,
      publicKeyX25519a,
    );
    expect(sharedSecret1).toStrictEqual(sharedSecret2);
    // Now we test equivalence against our own functions
    expect(
      asymmetric.publicKeyEd25519ToX25519(keyPair.publicKey),
    ).toStrictEqual(bufferWrap(publicKeyX25519a));
    expect(
      await asymmetric.privateKeyEd25519ToX25519(keyPair.privateKey),
    ).toStrictEqual(bufferWrap(privateKeyX25519));
    expect(await asymmetric.keyPairEd25519ToX25519(keyPair)).toStrictEqual({
      publicKey: bufferWrap(publicKeyX25519a),
      privateKey: bufferWrap(privateKeyX25519),
    });
  });
  testProp(
    'import and export ed25519 keypair',
    [testsKeysUtils.keyPairPArb],
    async (keyPairP) => {
      const keyPair = await keyPairP;
      const cryptoKeyPair = await asymmetric.importKeyPair(keyPair);
      expect(cryptoKeyPair.publicKey.type).toBe('public');
      expect(cryptoKeyPair.publicKey.extractable).toBe(true);
      expect(cryptoKeyPair.privateKey.type).toBe('private');
      expect(cryptoKeyPair.privateKey.extractable).toBe(true);
      const keyPair_ = await asymmetric.exportKeyPair(cryptoKeyPair);
      expect(keyPair_.publicKey).toStrictEqual(keyPair.publicKey);
      expect(keyPair_.privateKey).toStrictEqual(keyPair.privateKey);
    },
  );
  testProp(
    'convert to and from pem',
    [testsKeysUtils.keyPairPArb],
    async (keyPairP) => {
      const keyPair = await keyPairP;
      const keyPairPem = await asymmetric.keyPairToPem(keyPair);
      expect(keyPairPem.publicKey).toBeString();
      expect(keyPairPem.privateKey).toBeString();
      expect(keyPairPem.publicKey).toMatch(/-----BEGIN PUBLIC KEY-----/);
      expect(keyPairPem.publicKey).toMatch(/-----END PUBLIC KEY-----/);
      expect(keyPairPem.privateKey).toMatch(/-----BEGIN PRIVATE KEY-----/);
      expect(keyPairPem.privateKey).toMatch(/-----END PRIVATE KEY-----/);
      const keyPair_ = await asymmetric.keyPairFromPem(keyPairPem);
      expect(keyPair_).toBeDefined();
      expect(keyPair_!.publicKey).toStrictEqual(keyPair.publicKey);
      expect(keyPair_!.privateKey).toStrictEqual(keyPair.privateKey);
    },
  );
  testProp(
    'encrypt and decrypt - ephemeral static',
    [
      testsKeysUtils.keyPairPArb,
      fc.uint8Array({ minLength: 1, maxLength: 1024 }).map(bufferWrap),
    ],
    async (receiverKeyPairP, plainText) => {
      const receiverKeyPair = await receiverKeyPairP;
      const cipherText = await asymmetric.encryptWithPublicKey(
        receiverKeyPair.publicKey,
        plainText,
      );
      const plainText_ = await asymmetric.decryptWithPrivateKey(
        receiverKeyPair.privateKey,
        cipherText,
      );
      expect(plainText_).toStrictEqual(plainText);
    },
  );
  testProp(
    'encrypt and decrypt - static static',
    [
      testsKeysUtils.keyPairPArb,
      testsKeysUtils.keyPairPArb,
      fc.uint8Array({ minLength: 1, maxLength: 1024 }).map(bufferWrap),
    ],
    async (senderKeyPairP, receiverKeyPairP, plainText) => {
      const senderKeyPair = await senderKeyPairP;
      const receiverKeyPair = await receiverKeyPairP;
      const cipherText = await asymmetric.encryptWithPublicKey(
        receiverKeyPair.publicKey,
        plainText,
        senderKeyPair,
      );
      const plainText_ = await asymmetric.decryptWithPrivateKey(
        receiverKeyPair.privateKey,
        cipherText,
      );
      expect(plainText_).toStrictEqual(plainText);
    },
  );
  testProp(
    'sign and verify',
    [
      testsKeysUtils.keyPairPArb,
      testsKeysUtils.keyPairPArb,
      fc.uint8Array({ minLength: 1, maxLength: 1024 }).map(bufferWrap),
    ],
    async (keyPairPCorrect, keyPairPWrong, message) => {
      const keyPairCorrect = await keyPairPCorrect;
      const keyPairWrong = await keyPairPWrong;
      const signature = await asymmetric.signWithPrivateKey(
        keyPairCorrect.privateKey,
        message,
      );
      let verified: boolean;
      verified = await asymmetric.verifyWithPublicKey(
        keyPairCorrect.publicKey,
        message,
        signature,
      );
      expect(verified).toBe(true);
      verified = await asymmetric.verifyWithPublicKey(
        keyPairWrong.publicKey,
        message,
        signature,
      );
      expect(verified).toBe(false);
    },
  );
  testProp(
    'signatures are deterministic',
    [
      testsKeysUtils.keyPairPArb,
      fc.uint8Array({ minLength: 1, maxLength: 1024 }).map(bufferWrap),
    ],
    async (keyPairP, message) => {
      const keyPair = await keyPairP;
      const signature1 = await asymmetric.signWithPrivateKey(
        keyPair.privateKey,
        message,
      );
      const signature2 = await asymmetric.signWithPrivateKey(
        keyPair.privateKey,
        message,
      );
      expect(signature1).toStrictEqual(signature2);
    },
  );
  testProp(
    'public keys are node IDs',
    [testsKeysUtils.publicKeyArb],
    async (publicKeyP) => {
      const publicKey = await publicKeyP;
      const nodeId = asymmetric.publicKeyToNodeId(publicKey);
      const nodeIdEncoded = ids.encodeNodeId(nodeId);
      const nodeId_ = ids.decodeNodeId(nodeIdEncoded);
      expect(nodeId).toStrictEqual(nodeId_);
    },
  );
});
