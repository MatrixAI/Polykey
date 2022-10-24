import type {
  TokenPayload,
  TokenPayloadEncoded,
  TokenProtectedHeader,
  TokenProtectedHeaderEncoded,
  TokenSignature,
  TokenSignatureEncoded,
  TokenHeaderSignature,
  SignedToken,
  SignedTokenEncoded,
} from './types';
import canonicalize from 'canonicalize';
import * as ids from '../ids';

function isPayload(payload: any): payload is TokenPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  if ('iss' in payload && typeof payload.iss !== 'string') {
    return false;
  }
  if ('sub' in payload && typeof payload.sub !== 'string') {
    return false;
  }
  if (
    'aud' in payload &&
    typeof payload.aud !== 'string'
  ) {
    if (!Array.isArray(payload.aud)) {
      return false;
    }
    for (const aud_ of payload.aud) {
      if (typeof aud_ !== 'string') {
        return false;
      }
    }
  }
  if ('exp' in payload && typeof payload.exp !== 'number') {
    return false;
  }
  if ('nbf' in payload && typeof payload.nbf !== 'number') {
    return false;
  }
  if ('iat' in payload && typeof payload.iat !== 'number') {
    return false;
  }
  if ('jti' in payload && typeof payload.jti !== 'string') {
    return false;
  }
  return true;
}

/**
 * Encodes token payload with `base64url(json(TokenPayload))`
 */
function encodePayload(payload: TokenPayload): TokenPayloadEncoded {
  const payloadJSON = canonicalize(payload)!;
  const payloadData = Buffer.from(payloadJSON, 'utf-8');
  return payloadData.toString('base64url') as TokenPayloadEncoded;
}

function decodePayload<P extends TokenPayload = TokenPayload>(payloadEncoded: any): P | undefined {
  if (typeof payloadEncoded !== 'string') {
    return;
  }
  const payloadData = Buffer.from(payloadEncoded, 'base64url');
  const payloadJSON = payloadData.toString('utf-8');
  let payload;
  try {
    payload = JSON.parse(payloadJSON);
  } catch {
    return;
  }
  if (!isPayload(payload)) {
    return;
  }
  return payload as P;
}

function isProtectedHeader(header: any): header is TokenProtectedHeader {
  if (typeof header !== 'object' || header === null) {
    return false;
  }
  if ('alg' in header && typeof header.alg !== 'string') {
    return false;
  }
  if (header.alg !== 'EdDSA' && header.alg !== 'BLAKE2b') {
    return false;
  }
  if (header.alg === 'EdDSA') {
    const nodeId = ids.decodeNodeId(header.kid);
    if (nodeId == null) {
      return false;
    }
  }
  return true;
}

function encodeProtectedHeader(header: TokenProtectedHeader): TokenProtectedHeaderEncoded {
  const headerJSON = canonicalize(header)!
  const headerData = Buffer.from(headerJSON, 'utf-8');
  return headerData.toString('base64url') as TokenProtectedHeaderEncoded;
}

function decodeProtectedHeader(headerEncoded: any): TokenProtectedHeader | undefined {
  if (typeof headerEncoded !== 'string') {
    return;
  }
  const headerData = Buffer.from(headerEncoded, 'base64url');
  const headerJSON = headerData.toString('utf-8');
  let header;
  try {
    header = JSON.parse(headerJSON);
  } catch {
    return;
  }
  if (!isProtectedHeader(header)) {
    return;
  }
  return header;
}

function encodeSignature(signature: TokenSignature): TokenSignatureEncoded {
  return signature.toString('base64url') as TokenSignatureEncoded;
}

function decodeSignature(signatureEncoded: any): TokenSignature | undefined {
  if (typeof signatureEncoded !== 'string') {
    return;
  }
  const signature = Buffer.from(signatureEncoded, 'base64url');
  return signature as TokenSignature;
}

function encodeSigned(signed: SignedToken): SignedTokenEncoded {
  const payloadEncoded = encodePayload(signed.payload);
  const signaturesEncoded = signed.signatures.map((headerSignature) => {
    return {
      protected: encodeProtectedHeader(headerSignature.protected),
      signature: encodeSignature(headerSignature.signature)
    };
  });
  return {
    payload: payloadEncoded,
    signatures: signaturesEncoded
  };
}

function decodeSigned<P extends TokenPayload = TokenPayload>(signedEncoded: any): SignedToken<P> | undefined {
  if (typeof signedEncoded !== 'object' || signedEncoded === null) {
    return;
  }
  const payload = decodePayload(signedEncoded.payload);
  if (payload == null) {
    return;
  }
  if (!Array.isArray(signedEncoded.signatures)) {
    return;
  }
  const signatures: Array<TokenHeaderSignature> = [];
  for (const headerSignatureEncoded of signedEncoded.signatures) {
    if (typeof headerSignatureEncoded !== 'object' || headerSignatureEncoded === null) {
      return;
    }
    const protectedHeader = decodeProtectedHeader(headerSignatureEncoded.protected)
    if (protectedHeader == null) {
      return;
    }
    const signature = decodeSignature(headerSignatureEncoded.signature);
    if (signature == null) {
      return;
    }
    signatures.push({
      protected: protectedHeader,
      signature
    });
  }
  return {
    payload: payload as P,
    signatures
  };
}

// function hashToken<F extends DigestFormats>(
//   token: Token,
//   format: F
// ): Digest<F> {
//   const tokenString = canonicalize(token)!;
//   const tokenDigest = keysUtils.hash(
//     Buffer.from(tokenString, 'utf-8'),
//     format
//   );
//   return tokenDigest;
// }

export {
  isPayload,
  encodePayload,
  decodePayload,
  isProtectedHeader,
  encodeProtectedHeader,
  decodeProtectedHeader,
  encodeSignature,
  decodeSignature,
  encodeSigned,
  decodeSigned,
  // hashToken
};
