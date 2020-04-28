// @flow

// this module should be used to represent an identity
// which is a pub/priv keypair
// since we are using kbpgp
// then every identity has 1 kbpgp keymanager instance
// that keymanger instance can have a pub key, a priv key or any number of other keys
// we'll initiate with a root identity, which is the identity of the keynode
