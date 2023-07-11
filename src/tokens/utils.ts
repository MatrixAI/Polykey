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
  TokenHeaderSignatureEncoded,
} from './types';
import { Buffer } from 'buffer';
import canonicalize from 'canonicalize';
import * as ids from '../ids';
import * as validationErrors from '../validation/errors';
import * as keysUtils from '../keys/utils';
import * as utils from '../utils';
import {sign} from "../../tests/nodes/utils";

function generateTokenPayload(payload: TokenPayload): TokenPayloadEncoded {
  const payloadJSON = canonicalize(payload)!;
  const payloadData = Buffer.from(payloadJSON, 'utf-8');
  return payloadData.toString('base64url') as TokenPayloadEncoded;
}

function generateTokenProtectedHeader(
  header: TokenProtectedHeader,
): TokenProtectedHeaderEncoded {
  const headerJSON = canonicalize(header)!;
  const headerData = Buffer.from(headerJSON, 'utf-8');
  return headerData.toString('base64url') as TokenProtectedHeaderEncoded;
}

function generateTokenSignature(
  signature: TokenSignature,
): TokenSignatureEncoded {
  return signature.toString('base64url') as TokenSignatureEncoded;
}

function generateTokenHeaderSignature(
  tokenHeaderSignature: TokenHeaderSignature,
): TokenHeaderSignatureEncoded {
  return {
    protected: generateTokenProtectedHeader(tokenHeaderSignature.protected),
    signature: generateTokenSignature(tokenHeaderSignature.signature),
  };
}

function generateSignedToken(signed: SignedToken): SignedTokenEncoded {
  const payload = generateTokenPayload(signed.payload);
  const signatures = signed.signatures.map((tokenHeaderSignature) =>
    generateTokenHeaderSignature(tokenHeaderSignature),
  );
  return {
    payload,
    signatures,
  };
}

/**
 * Parses `TokenPayloadEncoded` to `TokenPayload`
 */
function parseTokenPayload<P extends TokenPayload = TokenPayload>(
  tokenPayloadEncoded: unknown,
): P {
  if (typeof tokenPayloadEncoded !== 'string') {
    throw new validationErrors.ErrorParse('must be a string');
  }
  const tokenPayloadData = Buffer.from(tokenPayloadEncoded, 'base64url');
  const tokenPayloadJSON = tokenPayloadData.toString('utf-8');
  let tokenPayload;
  try {
    tokenPayload = JSON.parse(tokenPayloadJSON);
  } catch {
    throw new validationErrors.ErrorParse(
      'must be a base64url encoded JSON POJO',
    );
  }
  if (!utils.isObject(tokenPayload)) {
    throw new validationErrors.ErrorParse(
      'must be a base64url encoded JSON POJO',
    );
  }
  if ('iss' in tokenPayload && typeof tokenPayload['iss'] !== 'string') {
    throw new validationErrors.ErrorParse('`iss` property must be a string');
  }
  if ('sub' in tokenPayload && typeof tokenPayload['sub'] !== 'string') {
    throw new validationErrors.ErrorParse('`sub` property must be a string');
  }
  if ('aud' in tokenPayload && typeof tokenPayload['aud'] !== 'string') {
    if (!Array.isArray(tokenPayload['aud'])) {
      throw new validationErrors.ErrorParse(
        '`aud` property must be a string or array of strings',
      );
    }
    for (const aud of tokenPayload['aud']) {
      if (typeof aud !== 'string') {
        throw new validationErrors.ErrorParse(
          '`aud` property must be a string or array of strings',
        );
      }
    }
  }
  if ('exp' in tokenPayload && typeof tokenPayload['exp'] !== 'number') {
    throw new validationErrors.ErrorParse('`exp` property must be a number');
  }
  if ('nbf' in tokenPayload && typeof tokenPayload['nbf'] !== 'number') {
    throw new validationErrors.ErrorParse('`nbf` property must be a number');
  }
  if ('iat' in tokenPayload && typeof tokenPayload['iat'] !== 'number') {
    throw new validationErrors.ErrorParse('`iat` property must be a number');
  }
  if ('jti' in tokenPayload && typeof tokenPayload['jti'] !== 'string') {
    throw new validationErrors.ErrorParse('`jti` property must be a string');
  }
  return tokenPayload as P;
}

/**
 * Parses `TokenProtectedHeaderEncoded` to `TokenProtectedHeader`
 */
function parseTokenProtectedHeader(
  tokenProtectedHeaderEncoded: unknown,
): TokenProtectedHeader {
  if (typeof tokenProtectedHeaderEncoded !== 'string') {
    throw new validationErrors.ErrorParse('must be a string');
  }
  const tokenProtectedHeaderData = Buffer.from(
    tokenProtectedHeaderEncoded,
    'base64url',
  );
  const tokenProtectedHeaderJSON = tokenProtectedHeaderData.toString('utf-8');
  let tokenProtectedHeader: any;
  try {
    tokenProtectedHeader = JSON.parse(tokenProtectedHeaderJSON);
  } catch {
    throw new validationErrors.ErrorParse(
      'must be a base64url encoded JSON POJO',
    );
  }
  if (!utils.isObject(tokenProtectedHeader)) {
    throw new validationErrors.ErrorParse(
      'must be a base64url encoded JSON POJO',
    );
  }
  if (typeof tokenProtectedHeader['alg'] !== 'string') {
    throw new validationErrors.ErrorParse('`alg` property must be a string');
  }
  if (
    tokenProtectedHeader['alg'] !== 'EdDSA' &&
    tokenProtectedHeader['alg'] !== 'BLAKE2b'
  ) {
    throw new validationErrors.ErrorParse(
      '`alg` property must be EdDSA or BLAKE2b',
    );
  }
  if (tokenProtectedHeader['alg'] === 'EdDSA') {
    const nodeId = ids.decodeNodeId(tokenProtectedHeader['kid']);
    if (nodeId == null) {
      throw new validationErrors.ErrorParse(
        '`kid` property must be a encoded node ID if `alg` property is EdDSA',
      );
    }
  }
  return tokenProtectedHeader as TokenProtectedHeader;
}

/**
 * Parses `TokenSignatureEncoded` to `TokenSignature`
 */
function parseTokenSignature(tokenSignatureEncoded: unknown): TokenSignature {
  if (typeof tokenSignatureEncoded !== 'string') {
    throw new validationErrors.ErrorParse('must be a string');
  }
  const signature = Buffer.from(tokenSignatureEncoded, 'base64url');
  if (!keysUtils.isSignature(signature) && !keysUtils.isMAC(signature)) {
    throw new validationErrors.ErrorParse(
      'must be a base64url encoded signature or MAC digest',
    );
  }
  return signature;
}

/**
 * Parses `TokenHeaderSignatureEncoded` to `TokenHeaderSignature`
 */
function parseTokenHeaderSignature(
  tokenHeaderSignatureEncoded: unknown,
): TokenHeaderSignature {
  if (!utils.isObject(tokenHeaderSignatureEncoded)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('protected' in tokenHeaderSignatureEncoded)) {
    throw new validationErrors.ErrorParse(
      '`protected` property must be defined',
    );
  }
  if (!('signature' in tokenHeaderSignatureEncoded)) {
    throw new validationErrors.ErrorParse(
      '`signature` property must be defined',
    );
  }
  const protectedHeader = parseTokenProtectedHeader(
    tokenHeaderSignatureEncoded['protected'],
  );
  const signature = parseTokenSignature(
    tokenHeaderSignatureEncoded['signature'],
  );
  return {
    protected: protectedHeader,
    signature: signature,
  };
}

/**
 * Parses `SignedTokenEncoded` to `SignedToken`
 */
function parseSignedToken<P extends TokenPayload = TokenPayload>(
  signedTokenEncoded: unknown,
): SignedToken<P> {
  if (!utils.isObject(signedTokenEncoded)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('payload' in signedTokenEncoded)) {
    throw new validationErrors.ErrorParse('`payload` property must be defined');
  }
  if (!('signatures' in signedTokenEncoded)) {
    throw new validationErrors.ErrorParse(
      '`signatures` property must be defined',
    );
  }
  const payload = parseTokenPayload<P>(signedTokenEncoded['payload']);
  if (!Array.isArray(signedTokenEncoded['signatures'])) {
    throw new validationErrors.ErrorParse(
      '`signatures` property must be an array',
    );
  }
  const signatures: Array<TokenHeaderSignature> = [];
  for (const headerSignatureEncoded of signedTokenEncoded['signatures']) {
    const tokenHeaderSignature = parseTokenHeaderSignature(
      headerSignatureEncoded,
    );
    signatures.push(tokenHeaderSignature);
  }
  return {
    payload,
    signatures,
  };
}

export {
  generateTokenPayload,
  generateTokenProtectedHeader,
  generateTokenSignature,
  generateTokenHeaderSignature,
  generateSignedToken,
  parseTokenPayload,
  parseTokenProtectedHeader,
  parseTokenSignature,
  parseTokenHeaderSignature,
  parseSignedToken,
};
