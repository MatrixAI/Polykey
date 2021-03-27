import type fs from 'fs/promises';

/**
 * Plain data dictionary
 */
type POJO = { [key: string]: any };

/**
 * Minimal filesystem type
 * Based on the required operations from fs/promises
 * Implement this with platform-specific filesystem
 */
interface FileSystem {
  rm: typeof fs.rm;
  stat: typeof fs.stat;
  readFile: typeof fs.readFile;
  writeFile: typeof fs.writeFile;
  copyFile: typeof fs.copyFile;
  readdir: typeof fs.readdir;
  rename: typeof fs.rename;
}

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

export { POJO, FileSystem, ProviderKey, IdentityKey };
