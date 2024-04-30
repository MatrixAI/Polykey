import { test, fc } from '@fast-check/jest';
import * as jwk from '@/keys/utils/jwk';
import * as testsKeysUtils from '../utils';

describe('keys/utils/jwk', () => {
  test.prop([testsKeysUtils.keyArb])('key convert to and from JWK', (key) => {
    const keyJWK = jwk.keyToJWK(key);
    expect(keyJWK.alg).toBe('XChaCha20-Poly1305-IETF');
    expect(keyJWK.kty).toBe('oct');
    expect(keyJWK.ext).toBe(true);
    expect(keyJWK.key_ops).toContainAllValues(['encrypt', 'decrypt']);
    expect(typeof keyJWK.k).toBe('string');
    const key_ = jwk.keyFromJWK(keyJWK);
    expect(key_).toStrictEqual(key);
  });
  test.prop([testsKeysUtils.publicKeyArb])(
    'public key convert to and from JWK',
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
  test.prop([testsKeysUtils.privateKeyArb])(
    'private key convert to and from JWK',
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
  test.prop([testsKeysUtils.keyPairArb])(
    'keypair convert to and from JWK',
    (keyPair) => {
      const keyPairJWK = jwk.keyPairToJWK(keyPair);
      const keyPair_ = jwk.keyPairFromJWK(keyPairJWK);
      expect(keyPair_).toStrictEqual(keyPair);
    },
  );
  test.prop([
    testsKeysUtils.keyJWKArb.map((keyJWK) => {
      return {
        ...keyJWK,
        k: fc.sample(fc.hexaString(), 1)[0],
      };
    }),
  ])('conversion from bad JWK key returns `undefined`', (badJWK) => {
    expect(jwk.keyFromJWK(badJWK)).toBeUndefined();
  });
  test.prop([
    testsKeysUtils.publicKeyJWKArb.map((publicKeyJWK) => {
      return {
        ...publicKeyJWK,
        x: fc.sample(fc.hexaString(), 1)[0],
      };
    }),
  ])('conversion from bad JWK public key returns `undefined`', (badJWK) => {
    expect(jwk.publicKeyFromJWK(badJWK)).toBeUndefined();
  });
  test.prop([
    testsKeysUtils.privateKeyJWKArb.map((privateKeyJWK) => {
      return {
        ...privateKeyJWK,
        x: fc.sample(fc.hexaString(), 1)[0],
        d: fc.sample(fc.hexaString(), 1)[0],
      };
    }),
  ])('conversion from bad JWK private key returns `undefined`', (badJWK) => {
    expect(jwk.privateKeyFromJWK(badJWK)).toBeUndefined();
  });
  test.prop([fc.object()])(
    'conversion from JWK returns `undefined` for random object',
    (randomObject) => {
      expect(jwk.keyFromJWK(randomObject)).toBeUndefined();
      expect(jwk.publicKeyFromJWK(randomObject)).toBeUndefined();
      expect(jwk.privateKeyFromJWK(randomObject)).toBeUndefined();
    },
  );
});
