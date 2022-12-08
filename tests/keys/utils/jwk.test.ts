import { testProp, fc } from '@fast-check/jest';
import * as jwk from '@/keys/utils/jwk';
import * as testsKeysUtils from '../utils';

describe('keys/utils/jwk', () => {
  testProp('key convert to and from JWK', [testsKeysUtils.keyArb], (key) => {
    const keyJWK = jwk.keyToJWK(key);
    expect(keyJWK.alg).toBe('XChaCha20-Poly1305-IETF');
    expect(keyJWK.kty).toBe('oct');
    expect(keyJWK.ext).toBe(true);
    expect(keyJWK.key_ops).toContainAllValues(['encrypt', 'decrypt']);
    expect(typeof keyJWK.k).toBe('string');
    const key_ = jwk.keyFromJWK(keyJWK);
    expect(key_).toStrictEqual(key);
  });
  testProp(
    'public key convert to and from JWK',
    [testsKeysUtils.publicKeyArb],
    (publicKey) => {
      const publicKeyJWK = jwk.publicKeyToJWK(publicKey);
      expect(publicKeyJWK.alg).toBe('EdDSA');
      expect(publicKeyJWK.kty).toBe('OKP');
      expect(publicKeyJWK.crv).toBe('Ed25519');
      expect(publicKeyJWK.ext).toBe(true);
      expect(publicKeyJWK.key_ops).toContainAllValues(['verify']);
      expect(typeof publicKeyJWK.x).toBe('string');
      const publicKey_ = jwk.publicKeyFromJWK(publicKeyJWK);
      expect(publicKey_).toStrictEqual(publicKey);
    },
  );
  testProp(
    'private key convert to and from JWK',
    [testsKeysUtils.privateKeyArb],
    (privateKey) => {
      const privateKeyJWK = jwk.privateKeyToJWK(privateKey);
      expect(privateKeyJWK.alg).toBe('EdDSA');
      expect(privateKeyJWK.kty).toBe('OKP');
      expect(privateKeyJWK.crv).toBe('Ed25519');
      expect(privateKeyJWK.ext).toBe(true);
      expect(privateKeyJWK.key_ops).toContainAllValues(['verify', 'sign']);
      expect(typeof privateKeyJWK.x).toBe('string');
      expect(typeof privateKeyJWK.d).toBe('string');
      const privateKey_ = jwk.privateKeyFromJWK(privateKeyJWK);
      expect(privateKey_).toStrictEqual(privateKey);
    },
  );
  testProp(
    'keypair convert to and from JWK',
    [testsKeysUtils.keyPairArb],
    (keyPair) => {
      const keyPairJWK = jwk.keyPairToJWK(keyPair);
      const keyPair_ = jwk.keyPairFromJWK(keyPairJWK);
      expect(keyPair_).toStrictEqual(keyPair);
    },
  );
  testProp(
    'conversion from bad JWK key returns `undefined`',
    [
      testsKeysUtils.keyJWKArb.map((keyJWK) => {
        return {
          ...keyJWK,
          k: fc.sample(fc.hexaString(), 1)[0],
        };
      }),
    ],
    (badJWK) => {
      expect(jwk.keyFromJWK(badJWK)).toBeUndefined();
    },
  );
  testProp(
    'conversion from bad JWK public key returns `undefined`',
    [
      testsKeysUtils.publicKeyJWKArb.map((publicKeyJWK) => {
        return {
          ...publicKeyJWK,
          x: fc.sample(fc.hexaString(), 1)[0],
        };
      }),
    ],
    (badJWK) => {
      expect(jwk.publicKeyFromJWK(badJWK)).toBeUndefined();
    },
  );
  testProp(
    'conversion from bad JWK private key returns `undefined`',
    [
      testsKeysUtils.privateKeyJWKArb.map((privateKeyJWK) => {
        return {
          ...privateKeyJWK,
          x: fc.sample(fc.hexaString(), 1)[0],
          d: fc.sample(fc.hexaString(), 1)[0],
        };
      }),
    ],
    (badJWK) => {
      expect(jwk.privateKeyFromJWK(badJWK)).toBeUndefined();
    },
  );
  testProp(
    'conversion from JWK returns `undefined` for random object',
    [fc.object()],
    (randomObject) => {
      expect(jwk.keyFromJWK(randomObject)).toBeUndefined();
      expect(jwk.publicKeyFromJWK(randomObject)).toBeUndefined();
      expect(jwk.privateKeyFromJWK(randomObject)).toBeUndefined();
    },
  );
});
