/**
 * This domain handles tokens and signed tokens.
 * It is loosely based on JWT and JWS specification.
 * It does not cover non-JWT JWS, not JWE or JWK.
 * @module
 */


// General token system based on JWS
// This only uses libsodium
// Provides the ability to "sign" structured data
// Can be used for identity claims, sigchain claims, authentication claims
// And of course notification claims (messages)

// Token, an object (in software or in hardware) which represents the right to perform some operation:
// thati si the definition of a "token"
// in that sense, a token is a "serialized capability"
// a capability is a "unforgeable token of authority"

// Ok our sigchain claims were designed based on scuttlebutt's feed protocol
// and that may be similar to activity pub protocol, but I didn't look too deep into that
// maybe even based on key base's system
// or even ethereum protocol
// right now everybody can make their own claims

// inbox/outbox - that's basically notifications
// the sigchain is "similar" to the "public collection"
// it makes it similar to activity streams JSON-LD
// there are some stuff like HTTP signatures and Linked Data Signatures
// but they seem to be "underspecified"

// ok i get this now

// so therefore:
// 1. ssb has its own format
// 2. activity pub has its own format
// 3. JWS is more "general" and probably most widely used format
// 4. PASETO is like a limited JWS
// 5. we use JWS, but in a limited way

// find out whether claims on identity should have their own "ID"
// i dont think so, since there's no way to locate them
// further more, claims should have their own ID encoded in their data

export { default as Token } from './Token';
export * as types from './types';
export * as utils from './utils';
