import type { TokenPayload, TokenSignature, TokenSigned }  from './types';
import type { Key, PublicKey, PrivateKey, KeyPair, Signature } from '../keys/types';
import type { POJO, DeepReadonly } from '../types';
import canonicalize from 'canonicalize';
import * as tokenUtils from './utils';
import * as keysUtils from '../keys/utils';
import * as ids from '../ids';

/**
 * Token represents a single token with methods to sign and verify.
 * This token is derived from a strict subset of the JWS specification.
 * The token payload must abide by the registered claims of JWS, additional
 * properties that do not conflict are allowed.
 * For public key signatures, it only supports `EdDSA` algorithm.
 * For MAC signatures, it only supports `BLAKE2b` algorithm.
 * Multiple signatures are allowed, including 0 signatures.
 * During signing, additional properties can be part of the protected header.
 * The serialised format is compatible with the General JWS JSON format.
 */
class Token {
  public readonly payload: DeepReadonly<TokenPayload>;

  // Store the encoded string, you can make use of
  // this can be a protected parameter
  // this can help us optimise later
  public readonly payloadEncoded: string;

  protected signatures: Array<TokenSignature> = [];
  // Index the signatures by the `kid`
  protected signaturesByKid: Map<string, TokenSignature> = new Map();

  // this allows us to quickly look it up
  // incase we are doing this



  // how do we ensure that
  // we can look up the individual payload
  // and if we are constructing it
  // we can construct it with different methods
  // the payload is added in
  // you may also acquire it from the full structure
  // Token.from(payload)
  // Token.from({ payload: ..., signatures: ... })
  // new Token({ ... })

  // construct it from signed
  public static fromPayload(tokenPayload: TokenPayload): Token {

    const token = new this(tokenPayload);

    // token.payload = tokenPayload;

  }

  public static fromSigned(tokenSigned: TokenSigned): Token {
    // take from an existing signed token
    // we have to parse out the details
    // and put them here
    // it's kind of like the x509 structure
    // in this sense
  }


  protected constructor(payload: TokenPayload) {
    this.payload = payload;
    const payloadJSON = canonicalize(this.payload)!;
    const payloadEncoded = Buffer.from(
      payloadJSON,
      'utf-8'
    ).toString('base64url');
    this.payloadEncoded = payloadEncoded;
  }


  public signWithKey(key: Key, additionalProtectedHeader?: POJO): void {
    const signature = tokenUtils.signWithKey(
      key,
      this.payload as TokenPayload,
      additionalProtectedHeader
    );
    this.signatures.push(signature);
  }

  public signWithPrivateKey(
    privateKeyOrKeyPair: PrivateKey | KeyPair,
    additionalProtectedHeader?: POJO
  ) {

    // The KID has to be part of this
    // to make this efficient
    // our utility functions
    // have to be BROUGHT into this method here
    const kid = ids.encodeNodeId(keysUtils.publicKeyToNodeId(keyPair.publicKey));

    if (this.signaturesByKid.has(kid)) {
      // Already has been signed
      throw new Error();
    }

    const signature = tokenUtils.signWithPrivateKey(
      privateKeyOrKeyPair,
      this.payload as TokenPayload,
      additionalProtectedHeader
    );
    this.signatures.push(signature);

    this.signaturesByKid.set(kid, signature);
  }

  /**
   * Iterates over the signatures by default
   * And attempts to authenticate the token
   * If it has a specific override... then that would be useful
   */
  public verifyWithKey(key: Key): boolean {
    for (const signature of this.signatures) {
      const protectedJSON = Buffer.from(signature.protected, 'base64url').toString('utf-8');
      const protectedHeader = JSON.parse(protectedJSON);
      const { alg } = protectedHeader;
      if (alg !== 'BLAKE2b') {
        continue;
      }
      const data = Buffer.from(this.payloadEncoded + '.' + signature.protected, 'utf-8');
      const auth = keysUtils.authWithKey(
        key,
        data,
        Buffer.from(signature.signature, 'base64url'),
      );
      if (!auth) continue;
      return true;
    }
    return false;
  }

  /**
   * Iterates over the signatures by default
   */
  public verifyWithPublicKey(publicKey: PublicKey) {

    // although if we know what the signatures are part of
    // we can index it more easily
    // and deal with them

    for (const signature of this.signatures) {
      const protectedJSON = Buffer.from(signature.protected, 'base64url').toString('utf-8');
      const protectedHeader = JSON.parse(protectedJSON);
      const { alg } = protectedHeader;
      if (alg !== 'BLAKE2b') {
        continue;
      }
      const data = Buffer.from(this.payloadEncoded + '.' + signature.protected, 'utf-8');
      const auth = keysUtils.verifyWithPublicKey(
        publicKey,
        data,
        Buffer.from(signature.signature, 'base64url') as Signature,
      );
      if (!auth) continue;
      return true;
    }
    return false;
  }

  // now when you verify
  // you must select the signatures

  public serialize(): TokenSigned {

    // i feel like the encoding and canoncialization is being repeated here

    const payloadJSON = canonicalize(this.payload)!;
    const payloadEncoded = Buffer.from(payloadJSON, 'utf-8').toString('base64url');

    // the signatures should be a COPY
    // you are not meant to mutate this

    // the signatures should be formed afterwards
    // each signature
    // can be stored


    return {
      payload: payloadEncoded,
      signatures: this.signatures
    };
  }

}

export default Token;
