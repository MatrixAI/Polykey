import type { NodeIdEncoded } from '../ids/types';
import type { ProviderId, IdentityId } from '../identities/types';

// claims are put onto the sigchain
// TokenClaimId


type Token = {

};

type ClaimData = ClaimLinkNode | ClaimLinkIdentity;

// Cryptolink (to either a node or an identity)
type ClaimLinkNode = {
  type: 'node';
  node1: NodeIdEncoded;
  node2: NodeIdEncoded;
};
type ClaimLinkIdentity = {
  type: 'identity';
  node: NodeIdEncoded;
  provider: ProviderId;
  identity: IdentityId;
};



// Notification token
type TokenNotification = Token & {

};

// This doesn't necessraily have a sequence
// primarily because a "token" is posted in 2 places
// between the idnetity

// Identity token (used for identities... and posted on third party identities)
type TokenIdentity = Token & {

};

// Claim token (used inside the sighcain)

// a full token claim
// has to use the data here
// we want to allow ANY kind of data right?
// it's really arbitrary data
// it literally could be anything
// but if we allow anything, then anything must check what is available
// we do have to say it is a "typed" structure
// and not just any data at all!!

type TokenClaim = Token & {
  payload: {
    hPrev: string | null; // Hash of the previous claim (null if first claim)
    seq: number; // Sequence number of the claim
    data: ClaimData; // Our custom payload data
    iat: number; // Timestamp (initialised at JWS field)
  };
  signatures: Record<NodeIdEncoded, TokenSignature>; // Signee node ID -> claim signature
};


// signature: 'base64urlencodedstring';
// header: { alg: 'EdDSA', kid: 'NODEID' };

type TokenSignature = {
  signature: string;
  header: {
    alg: string; // Signing algorithm (e.g. RS256 for RSA keys)
    kid: NodeIdEncoded; // Node ID of the signing keynode
  };
};

export type {
  Token,
  TokenClaim,
  TokenSignature,
};
