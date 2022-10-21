import type {
  TokenPayload,
  TokenPayloadEncoded,
  TokenSignatureEncoded,
  TokenHeaderSignature,
  TokenHeaderSignatureEncoded,
  TokenSigned,
  TokenSignedEncoded,
}  from './types';
import type {
  Key,
  PublicKey,
  PrivateKey,
  KeyPair
} from '../keys/types';
import type { POJO, DeepReadonly } from '../types';
import * as ids from '../ids';
import * as tokenUtils from './utils';
import * as tokenErrors from './errors';
import * as keysUtils from '../keys/utils';
import * as utils from '../utils';

/**
 * Token represents a single token with methods to sign and verify.
 * This token is derived from a strict subset of the JWS specification.
 * The token payload must abide by the registered claims of JWS, additional
 * properties that do not conflict are allowed.
 * For public key signatures, it only supports `EdDSA` algorithm.
 * For MAC signatures, it only supports `BLAKE2b` algorithm.
 * Multiple signatures are allowed, including 0 signatures.
 * During signing, additional properties can be part of the protected header.
 * The encoded format is compatible with the General JWS JSON format.
 */
class Token {
  public readonly payload: DeepReadonly<TokenPayload>;
  public readonly payloadEncoded: TokenPayloadEncoded;

  protected _signatures: Array<TokenHeaderSignature> = [];
  protected _signaturesEncoded: Array<TokenHeaderSignatureEncoded> = [];
  protected signatureIndex: Set<TokenSignatureEncoded> = new Set();

  public static fromPayload(payload: TokenPayload): Token {
    const payloadEncoded = tokenUtils.encodePayload(payload);
    return new this(payload, payloadEncoded);
  }

  public static fromSigned(tokenSigned: TokenSigned): Token {
    const payloadEncoded = tokenUtils.encodePayload(tokenSigned.payload);
    const signaturesEncoded = tokenSigned.signatures.map((headerSignature) => {
      return {
        protected: tokenUtils.encodeProtectedHeader(headerSignature.protected),
        signature: tokenUtils.encodeSignature(headerSignature.signature)
      };
    });
    return new this(
      tokenSigned.payload,
      payloadEncoded,
      tokenSigned.signatures,
      signaturesEncoded
    );
  }

  public static fromEncoded(tokenEncoded: TokenSignedEncoded): Token {
    const payload = tokenUtils.decodePayload(tokenEncoded.payload);
    if (payload == null) {
      throw new tokenErrors.ErrorTokensPayloadParse();
    }
    const signatures: Array<TokenHeaderSignature> = [];
    for (const headerSignatureEncoded of tokenEncoded.signatures) {
      const protectedHeader = tokenUtils.decodeProtectedHeader(headerSignatureEncoded.protected)
      if (protectedHeader == null) {
        throw new tokenErrors.ErrorTokensProtectedHeaderParse();
      }
      const signature = tokenUtils.decodeSignature(headerSignatureEncoded.signature);
      if (signature == null) {
        throw new tokenErrors.ErrorTokensSignatureParse();
      }
      signatures.push({
        protected: protectedHeader,
        signature
      });
    }
    return new this(
      payload,
      tokenEncoded.payload,
      signatures,
      tokenEncoded.signatures
    );
  }

  public constructor(
    payload: TokenPayload,
    payloadEncoded: TokenPayloadEncoded,
    signatures: Array<TokenHeaderSignature> = [],
    signaturesEncoded: Array<TokenHeaderSignatureEncoded> = []
  ) {
    this.payload = payload;
    this.payloadEncoded = payloadEncoded;
    this._signatures = signatures;
    this._signaturesEncoded = signaturesEncoded;
    for (const headerSignature of signaturesEncoded) {
      this.signatureIndex.add(headerSignature.signature);
    }
  }

  get signatures(): DeepReadonly<typeof this._signatures> {
    return this._signatures;
  }

  get signaturesEncoded(): DeepReadonly<typeof this._signaturesEncoded> {
    return this._signaturesEncoded;
  }

  public signWithKey(
    key: Key,
    additionalProtectedHeader?: POJO,
    force: boolean = false
  ): void {
    const protectedHeader = {
      ...additionalProtectedHeader,
      alg: 'BLAKE2b' as const
    };
    const protectedHeaderEncoded = tokenUtils.encodeProtectedHeader(
      protectedHeader
    );
    const data = Buffer.from(
      this.payloadEncoded + '.' + protectedHeaderEncoded,
      'ascii'
    );
    const signature = keysUtils.macWithKey(key, data);
    const signatureEncoded = tokenUtils.encodeSignature(signature);
    if (
      !force &&
      this.signatureIndex.has(signatureEncoded)
    ) {
      throw new tokenErrors.ErrorTokensDuplicateSignature();
    }
    this._signatures.push({
      protected: protectedHeader,
      signature: signature
    });
    this._signaturesEncoded.push({
      protected: protectedHeaderEncoded,
      signature: signatureEncoded
    });
    this.signatureIndex.add(signatureEncoded);
  }

  public signWithPrivateKey(
    privateKeyOrKeyPair: PrivateKey | KeyPair,
    additionalProtectedHeader?: POJO,
    force: boolean = false
  ): void {
    let keyPair: KeyPair;
    if (Buffer.isBuffer(privateKeyOrKeyPair)) {
      const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(
        privateKeyOrKeyPair
      );
      keyPair = keysUtils.makeKeyPair(publicKey, privateKeyOrKeyPair);
    } else {
      keyPair = privateKeyOrKeyPair;
    }
    const kid = ids.encodeNodeId(
      keysUtils.publicKeyToNodeId(keyPair.publicKey)
    );
    const protectedHeader = {
      ...additionalProtectedHeader,
      alg: 'EdDSA' as const,
      kid
    };
    const protectedHeaderEncoded = tokenUtils.encodeProtectedHeader(
      protectedHeader
    );
    const data = Buffer.from(
      this.payloadEncoded + '.' + protectedHeaderEncoded,
      'ascii'
    );
    const signature = keysUtils.signWithPrivateKey(keyPair, data);
    const signatureEncoded = tokenUtils.encodeSignature(signature);
    if (
      !force &&
      this.signatureIndex.has(signatureEncoded)
    ) {
      throw new tokenErrors.ErrorTokensDuplicateSignature();
    }
    this._signatures.push({
      protected: protectedHeader,
      signature: signature
    });
    this._signaturesEncoded.push({
      protected: protectedHeaderEncoded,
      signature: signatureEncoded
    });
    this.signatureIndex.add(signatureEncoded);
  }

  /**
   * Iterates over the signatures and attempts MAC verification
   */
  public verifyWithKey(key: Key): boolean {
    for (let i = 0; i < this._signatures.length; i++) {
      const headerSignature = this._signatures[i];
      const headerSignatureEncoded = this._signaturesEncoded[i];
      if (headerSignature.protected.alg !== 'BLAKE2b') {
        continue;
      }
      const data = Buffer.from(
        this.payloadEncoded + '.' + headerSignatureEncoded.protected,
        'ascii'
      );
      const auth = keysUtils.authWithKey(
        key,
        data,
        headerSignature.signature
      );
      if (!auth) continue;
      return true;
    }
    return false;
  }

  /**
   * Iterates over the signatures and attempts digital signature verification
   */
  public verifyWithPublicKey(publicKey: PublicKey) {
    for (let i = 0; i < this._signatures.length; i++) {
      const headerSignature = this._signatures[i];
      const headerSignatureEncoded = this._signaturesEncoded[i];
      if (headerSignature.protected.alg !== 'EdDSA') {
        continue;
      }
      const data = Buffer.from(
        this.payloadEncoded + '.' + headerSignatureEncoded.protected,
        'ascii'
      );
      const auth = keysUtils.verifyWithPublicKey(
        publicKey,
        data,
        headerSignature.signature,
      );
      if (!auth) continue;
      return true;
    }
    return false;
  }

  /**
   * Exports this `Token` into `TokenSigned`
   */
  public toSigned(): TokenSigned {
    return {
      payload: utils.structuredClone(this.payload),
      signatures: utils.structuredClone(this._signatures),
    };
  }

  /**
   * Exports this `Token` into `TokenSignedEncoded`
   */
  public toEncoded(): TokenSignedEncoded {
    return {
      payload: this.payloadEncoded,
      signatures: [...this._signaturesEncoded],
    };
  }

  /**
   * The JSON representation of this `Token` is `TokenSignedEncoded`
   */
  public toJSON() {
    return this.toEncoded();
  }
}

export default Token;
