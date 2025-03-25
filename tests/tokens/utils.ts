import type {
  SignedToken,
  TokenHeaderSignature,
  TokenProtectedHeader,
} from '#tokens/types.js';
import { fc } from '@fast-check/jest';
import * as testsKeysUtils from '../keys/utils.js';
import * as testsIdsUtils from '../ids/utils.js';
import * as tokensUtils from '#tokens/utils.js';

const tokenPayloadArb = fc
  .record(
    {
      jti: fc.option(fc.string(), { nil: undefined }),
      iat: fc.option(fc.nat(), { nil: undefined }),
      nbf: fc.option(fc.nat(), { nil: undefined }),
      exp: fc.option(fc.nat(), { nil: undefined }),
      iss: fc.option(fc.string(), { nil: undefined }),
      sub: fc.option(fc.string(), { nil: undefined }),
      aud: fc.option(fc.oneof(fc.string(), fc.array(fc.string())), {
        nil: undefined,
      }),
    },
    { noNullPrototype: true },
  )
  .chain((value) => {
    return fc.json().chain((json) => {
      return fc.constant({
        ...(JSON.parse(json) as object),
        ...value,
      });
    });
  });
const tokenProtectedHeaderArb = fc
  .oneof(
    fc.record(
      {
        alg: fc.constant('EdDSA'),
        kid: testsIdsUtils.nodeIdEncodedArb,
      },
      { noNullPrototype: true },
    ),
    fc.record(
      {
        alg: fc.constant('BLAKE2b'),
      },
      { noNullPrototype: true },
    ),
  )
  .chain((value) => {
    return fc.json().chain((json) => {
      return fc.constant({
        ...(JSON.parse(json) as object),
        ...value,
      });
    });
  }) as fc.Arbitrary<TokenProtectedHeader>;

const tokenSignatureArb = fc.oneof(
  testsKeysUtils.signatureArb,
  testsKeysUtils.macArb,
);

const tokenHeaderSignatureArb = fc.record(
  {
    protected: tokenProtectedHeaderArb,
    signature: tokenSignatureArb,
  },
  { noNullPrototype: true },
) as fc.Arbitrary<TokenHeaderSignature>;

const signedTokenArb = fc.record(
  {
    payload: tokenPayloadArb,
    signatures: fc.array(tokenHeaderSignatureArb),
  },
  { noNullPrototype: true },
) as fc.Arbitrary<SignedToken>;

const tokenPayloadEncodedArb = tokenPayloadArb.map(
  tokensUtils.generateTokenPayload,
);

const tokenProtectedHeaderEncodedArb = tokenProtectedHeaderArb.map(
  tokensUtils.generateTokenProtectedHeader,
);

const tokenSignatureEncodedArb = tokenSignatureArb.map(
  tokensUtils.generateTokenSignature,
);

const tokenHeaderSignatureEncodedArb = tokenHeaderSignatureArb.map(
  tokensUtils.generateTokenHeaderSignature,
);

const signedTokenEncodedArb = signedTokenArb.map(
  tokensUtils.generateSignedToken,
);

export {
  tokenPayloadArb,
  tokenProtectedHeaderArb,
  tokenSignatureArb,
  tokenHeaderSignatureArb,
  signedTokenArb,
  tokenPayloadEncodedArb,
  tokenProtectedHeaderEncodedArb,
  tokenSignatureEncodedArb,
  tokenHeaderSignatureEncodedArb,
  signedTokenEncodedArb,
};
