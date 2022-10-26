import { signedClaimValidate } from './src/claims/schema';
import { ClaimIdEncoded, SignedClaim } from './src/claims/types';
import { NodeIdEncoded } from './src/ids/types';

async function main () {

  const y: SignedClaim = {
    payload: {
      jti: 'abc' as ClaimIdEncoded,
      nbf: 123,
      iat: 456,
      seq: 123,
      prevClaimId: 'abc' as ClaimIdEncoded,
      prevDigest: null,
      iss: 'abc' as NodeIdEncoded,
      sub: 'abc',
    },
    signatures: [{
      protected: {
        alg: "BLAKE2b"
      },
      header: {

      },
      signature: "abc",
    }]
  };

  const x = signedClaimValidate(
    y
  );

  console.log(signedClaimValidate.errors);

}

main();
