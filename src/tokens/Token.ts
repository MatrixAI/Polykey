import type {
  TokenPayload,
  TokenPayloadEncoded,
  TokenSignatureEncoded,
  TokenHeaderSignature,
  TokenHeaderSignatureEncoded,
  SignedToken,
  SignedTokenEncoded,
} from './types';
import type { Key, PublicKey, PrivateKey, KeyPair } from '../keys/types';
import type { POJO } from '../types';
import * as tokensUtils from './utils';
import * as tokensErrors from './errors';
import * as ids from '../ids';
import * as keysUtils from '../keys/utils';
import * as utils from '../utils';
import * as validationErrors from '../validation/errors';

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
class Token<P extends TokenPayload = TokenPayload> {
  public readonly payload: Readonly<P>;
  public readonly payloadEncoded: TokenPayloadEncoded;

  protected _signatures: Array<TokenHeaderSignature> = [];
  protected _signaturesEncoded: Array<TokenHeaderSignatureEncoded> = [];
  protected signatureSet: Set<TokenSignatureEncoded> = new Set();

  public static fromPayload<P extends TokenPayload = TokenPayload>(
    payload: P,
  ): Token<P> {
    const payloadEncoded = tokensUtils.generateTokenPayload(payload);
    return new this(payload, payloadEncoded);
  }

  public static fromSigned<P extends TokenPayload = TokenPayload>(
    tokenSigned: SignedToken<P>,
  ): Token<P> {
    const tokenSignedEncoded = tokensUtils.generateSignedToken(tokenSigned);
    return new this(
      tokenSigned.payload,
      tokenSignedEncoded.payload,
      tokenSigned.signatures,
      tokenSignedEncoded.signatures,
    );
  }

  /**
   * Construct from encoded payload.
   * It is up the caller to decide what the payload type should be.
   */
  public static fromEncoded<P extends TokenPayload = TokenPayload>(
    signedTokenEncoded: SignedTokenEncoded,
  ): Token<P> {
    let signedToken: SignedToken<P>;
    try {
      signedToken = tokensUtils.parseSignedToken<P>(signedTokenEncoded);
    } catch (e) {
      if (e instanceof validationErrors.ErrorParse) {
        throw new tokensErrors.ErrorTokensSignedParse(undefined, { cause: e });
      } else {
        throw e;
      }
    }
    return new this(
      signedToken.payload,
      signedTokenEncoded.payload,
      signedToken.signatures,
      signedTokenEncoded.signatures,
    );
  }

  public constructor(
    payload: P,
    payloadEncoded: TokenPayloadEncoded,
    signatures: Array<TokenHeaderSignature> = [],
    signaturesEncoded: Array<TokenHeaderSignatureEncoded> = [],
  ) {
    this.payload = payload;
    this.payloadEncoded = payloadEncoded;
    this._signatures = signatures;
    this._signaturesEncoded = signaturesEncoded;
    for (const headerSignatureEncoded of signaturesEncoded) {
      this.signatureSet.add(headerSignatureEncoded.signature);
    }
  }

  public get signatures(): Readonly<Array<Readonly<TokenHeaderSignature>>> {
    return this._signatures;
  }

  public get signaturesEncoded(): Readonly<
    Array<Readonly<TokenHeaderSignatureEncoded>>
  > {
    return this._signaturesEncoded;
  }

  public signWithKey(
    key: Key,
    additionalProtectedHeader?: POJO,
    force: boolean = false,
  ): void {
    const protectedHeader = {
      ...additionalProtectedHeader,
      alg: 'BLAKE2b' as const,
    };
    const protectedHeaderEncoded =
      tokensUtils.generateTokenProtectedHeader(protectedHeader);
    const data = Buffer.from(
      this.payloadEncoded + '.' + protectedHeaderEncoded,
      'ascii',
    );
    const signature = keysUtils.macWithKey(key, data);
    const signatureEncoded = tokensUtils.generateTokenSignature(signature);
    if (!force && this.signatureSet.has(signatureEncoded)) {
      throw new tokensErrors.ErrorTokensDuplicateSignature();
    }
    this._signatures.push({
      protected: protectedHeader,
      signature: signature,
    });
    this._signaturesEncoded.push({
      protected: protectedHeaderEncoded,
      signature: signatureEncoded,
    });
    this.signatureSet.add(signatureEncoded);
  }

  public signWithPrivateKey(
    privateKeyOrKeyPair: PrivateKey | KeyPair,
    additionalProtectedHeader?: POJO,
    force: boolean = false,
  ): void {
    let keyPair: KeyPair;
    if (Buffer.isBuffer(privateKeyOrKeyPair)) {
      const publicKey =
        keysUtils.publicKeyFromPrivateKeyEd25519(privateKeyOrKeyPair);
      keyPair = keysUtils.makeKeyPair(publicKey, privateKeyOrKeyPair);
    } else {
      keyPair = privateKeyOrKeyPair;
    }
    const kid = ids.encodeNodeId(
      keysUtils.publicKeyToNodeId(keyPair.publicKey),
    );
    const protectedHeader = {
      ...additionalProtectedHeader,
      alg: 'EdDSA' as const,
      kid,
    };
    const protectedHeaderEncoded =
      tokensUtils.generateTokenProtectedHeader(protectedHeader);
    const data = Buffer.from(
      this.payloadEncoded + '.' + protectedHeaderEncoded,
      'ascii',
    );
    const signature = keysUtils.signWithPrivateKey(keyPair, data);
    const signatureEncoded = tokensUtils.generateTokenSignature(signature);
    if (!force && this.signatureSet.has(signatureEncoded)) {
      throw new tokensErrors.ErrorTokensDuplicateSignature();
    }
    const headerSignature = {
      protected: protectedHeader,
      signature: signature,
    };
    const headerSignatureEncoded = {
      protected: protectedHeaderEncoded,
      signature: signatureEncoded,
    };
    this._signatures.push(headerSignature);
    this._signaturesEncoded.push(headerSignatureEncoded);
    this.signatureSet.add(signatureEncoded);
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
        'ascii',
      );
      const auth = keysUtils.authWithKey(key, data, headerSignature.signature);
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
        'ascii',
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
   * Exports this `Token` into `SignedToken`
   */
  public toSigned(): SignedToken<P> {
    return {
      payload: utils.structuredClone(this.payload),
      signatures: utils.structuredClone(this._signatures),
    };
  }

  /**
   * Exports this `Token` into `SignedTokenEncoded`
   */
  public toEncoded(): SignedTokenEncoded {
    return {
      payload: this.payloadEncoded,
      signatures: [...this._signaturesEncoded],
    };
  }

  /**
   * The JSON representation of this `Token` is `SignedTokenEncoded`
   */
  public toJSON() {
    return this.toEncoded();
  }
}

export default Token;
