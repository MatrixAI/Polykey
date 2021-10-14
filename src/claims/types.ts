import type { Opaque } from '../types';
import type { NodeId } from '../nodes/types';
import type { ProviderId, IdentityId } from '../identities/types';
import type { GeneralJWS, FlattenedJWSInput } from 'jose/types';
import { RandomId, RawRandomId } from "../GenericIdTypes";

/**
 * A JSON-ified, decoded version of the ClaimEncoded type.
 * Assumes the Claim was created through claims.utils::createClaim()
 * See claims.utils::decodeClaim() for construction.
 * The signatures field is expected to contain:
 *   - 1 signature if its a node -> identity claim (only signed by node)
 *   - 2 signatures if its a node -> node claim (signed by node1 and node2)
 */
type Claim = {
  payload: {
    hPrev: string | null; // Hash of the previous claim (null if first claim)
    seq: number; // Sequence number of the claim
    data: ClaimData; // Our custom payload data
    iat: number; // Timestamp (initialised at JWS field)
  };
  signatures: Record<NodeId | string , SignatureData>; // Signee node ID -> claim signature // FIXME: the string union on VaultId is to prevent some false errors.
};

/**
 * A dummy type for Claim, using a string as the record key.
 * Ajv is unable to validate the JSON schema with NodeId set as the record key.
 * This is only used in src/claims/schema.ts.
 */
type ClaimValidation = Omit<Claim, 'signatures'> & {
  signatures: Record<string, SignatureData>; // Replaces NodeId key with string
};

/**
 * A signature of a claim (signing the header + payload).
 */
type SignatureData = {
  signature: string;
  header: {
    alg: string; // Signing algorithm (e.g. RS256 for RSA keys)
    kid: NodeId; // Node ID of the signing keynode
  };
};

/**
 * An arbitraty string serving as a unique identitifer for a particular claim.
 * Depending on the domain the claim is used in, its implementation detail will
 * differ. For example, the sigchain domain uses a lexicographic-integer as the
 * claim ID (representing the sequence number key of the claim).
 */
type ClaimId = Opaque<'ClaimId', RawRandomId>;
type ClaimIdString = Opaque<'ClaimIdString', RandomId>;

type ClaimIdGenerator = () => ClaimId;

/**
 * A ClaimEncoded is an encoded version of Claim. It is exactly a JWS using
 * General JSON serialization. For our context, it is a claim (e.g. a cryptolink)
 * made by a node and stored in its append-only sigchain or on an identity
 * platform.
 * See claims.utils::createClaim() for its construction.
 * Its structure is:
 *  - payload: a base64 encoded string the JSON payload
 *  - signatures: an array of objects containing:
 *      - signature: a base64 encoded signature (signed on header + payload)
 *      - protected: a base64 encoded header (for our purpose, of alg + kid)
 */
// type ClaimEncoded = Opaque<'ClaimEncoded', string>;
type ClaimEncoded = GeneralJWS;

/**
 * An encoded intermediary claim with a single signature.
 * Can be sent across GRPC to be signed by another keynode.
 * Currently used for establishing node to node claims by cross-signing the claim
 * with both nodes.
 */
type ClaimIntermediary = Omit<GeneralJWS, 'signatures'> & {
  signature: Omit<FlattenedJWSInput, 'payload'>;
};

// Claims can currently only be a cryptolink to a node or identity
type ClaimData = ClaimLinkNode | ClaimLinkIdentity;

// Cryptolink (to either a node or an identity)
type ClaimLinkNode = {
  type: 'node';
  node1: NodeId;
  node2: NodeId;
};
type ClaimLinkIdentity = {
  type: 'identity';
  node: NodeId;
  provider: ProviderId;
  identity: IdentityId;
};

// TODO: A better way of creating this enum-like type (used in 'type' field of
// all ClaimData types) rather than manually adding the type here.
type ClaimType = 'node' | 'identity';

export type {
  Claim,
  ClaimValidation,
  ClaimIntermediary,
  SignatureData,
  ClaimId,
  ClaimIdString,
  ClaimIdGenerator,
  ClaimEncoded,
  ClaimData,
  ClaimLinkNode,
  ClaimLinkIdentity,
  ClaimType,
};
