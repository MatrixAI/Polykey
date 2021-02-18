type NodeId = string;

/**
 * Provider key should be the domain of the identity provider
 */
type ProviderKey = string;

/**
 * Identity key must uniquely identify the identity on the identity provider.
 * It must be the key that is used to look up the identity.
 * If the provider uses a non-string type, make the necessary conversions.
 */
type IdentityKey = string;

type POJO = { [key: string]: any };

export { NodeId, ProviderKey, IdentityKey, POJO };
