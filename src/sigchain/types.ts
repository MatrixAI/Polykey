import type { Opaque } from '../types';
import type { NodeId } from '../nodes/types';
import type { ProviderId, IdentityId } from '../identities/types';
import type { LinkId } from '../links/types';

// A Claim is exactly a JWS: a base64 encoded string. It is a claim (e.g. a
// cryptolink) made by a node and stored in its append-only sigchain.
// It contains:
//   * header:
//     * alg
//   * payload:
//     * iat
//     * ClaimPayload
//   * signature (of header + payload)
// See Sigchain::createClaim() for its construction.
type Claim = Opaque<'Claim', string>;

// A decoded version of the Claim type.
// Assumes the Claim was created through Sigchain::createClaim()
// See utils::decodeClaim() for construction.
type DecodedClaim = {
  header: {
    alg: string;
  };
  payload: ClaimPayload & {
    iat: number;
  };
};

type ClaimPayload = {
  hashPrevious: string;
  sequenceNumber: number;
  claimData: ClaimData;
};

// Abstracting the type of data that appears in the sigchain Claim's payload
// Can eventually be extended to include other types of payloads (not just
// cryptolinks)
type ClaimData = Cryptolink | ArbitraryType;

// Used for testing purposes (and for checking type safety with usage of ClaimData).
// TODO: Remove once some other ClaimData type is introduced.
type ArbitraryType = {
  claimType: 'arbitrary';
};

type Cryptolink = (CryptolinkIdentity | CryptolinkNode) & {
  claimType: 'cryptolink';
  linkId: LinkId;
};

// TODO: Potentially remove this
type CryptolinkType = CryptolinkIdentity | CryptolinkNode;

type CryptolinkIdentity = {
  type: 'identity';
  node: NodeId;
  provider: ProviderId;
  identity: IdentityId;
};

type CryptolinkNode = {
  type: 'node';
  node1: NodeId;
  node2: NodeId;
};

// Encoded as a string in order to be used as a key for subleveldown
// "keys must encode to either strings or Buffers."
// Rather than do an implicit conversion, easiest to just explicitly declare this.
type SequenceNumber = Opaque<'SequenceNumber', string>;

type SigchainOp_ =
  | {
      domain: 'claims';
      key: SequenceNumber;
      value: Claim;
    }
  | {
      domain: 'metadata';
      key: string;
      value: number;
    };

type SigchainOp =
  | ({
      type: 'put';
    } & SigchainOp_)
  | ({
      type: 'del';
    } & Omit<SigchainOp_, 'value'>);

export type {
  Claim,
  DecodedClaim,
  ClaimPayload,
  ClaimData,
  ArbitraryType,
  Cryptolink,
  CryptolinkIdentity,
  CryptolinkNode,
  SequenceNumber,
  SigchainOp,
};
