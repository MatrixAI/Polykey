declare module '@matrixai/polykey/proto/js/Agent' {
  export = $root;
  var $root: protobuf.Root;

}
declare module '@matrixai/polykey/proto/js/Git' {
  export = $root;
  var $root: protobuf.Root;

}
declare module '@matrixai/polykey/proto/js/Peer' {
  export = $root;
  var $root: protobuf.Root;

}
declare module '@matrixai/polykey/src/lib/Polykey' {
  /// <reference types="node" />
  import fs from 'fs';
  import KeyManager from '@matrixai/polykey/src/lib/keys/KeyManager';
  import PeerManager from '@matrixai/polykey/src/lib/peers/PeerManager';
  import VaultManager from '@matrixai/polykey/src/lib/vaults/VaultManager';
  import PolykeyAgent from '@matrixai/polykey/src/lib/agent/PolykeyAgent';
  import PolykeyClient from '@matrixai/polykey/src/lib/agent/PolykeyClient';
  class Polykey {
      polykeyPath: string;
      vaultManager: VaultManager;
      keyManager: KeyManager;
      peerManager: PeerManager;
      constructor(polykeyPath: string | undefined, fileSystem: typeof fs, keyManager?: KeyManager, vaultManager?: VaultManager, peerManager?: PeerManager);
  }
  export default Polykey;
  export { KeyManager, VaultManager, PeerManager, PolykeyAgent, PolykeyClient };

}
declare module '@matrixai/polykey/src/lib/agent/PolykeyAgent' {
  import PolykeyClient from '@matrixai/polykey/src/lib/agent/PolykeyClient';
  import { Duplex } from 'readable-stream';
  class PolykeyAgent {
      private socketPath;
      private server;
      private persistentStore;
      private polykeyMap;
      private setPolyKey;
      private removeNodePath;
      private getPolyKey;
      get AllNodePaths(): string[];
      get UnlockedNodePaths(): string[];
      constructor();
      stop(): void;
      private handleClientCommunication;
      private registerNode;
      private newNode;
      private listNodes;
      private deriveKey;
      private listKeys;
      private getKey;
      private getPrimaryKeyPair;
      private deleteKey;
      private signFile;
      private verifyFile;
      private encryptFile;
      private decryptFile;
      private listVaults;
      private newVault;
      private destroyVault;
      private listSecrets;
      private createSecret;
      private destroySecret;
      private getSecret;
      private updateSecret;
      static connectToAgent(getStream?: () => Duplex): PolykeyClient;
      static get SocketPath(): string;
      static get LogPath(): string;
      static DAEMON_SCRIPT_PATH: string;
      static startAgent(daemon?: boolean): Promise<number>;
  }
  export default PolykeyAgent;

}
declare module '@matrixai/polykey/src/lib/agent/PolykeyClient' {
  /// <reference types="node" />
  import { Duplex } from 'readable-stream';
  class PolykeyClient {
      private getStream;
      constructor(getStream: () => Duplex);
      sendRequestToAgent(request: Uint8Array): Promise<Uint8Array[]>;
      private handleAgentCommunication;
      registerNode(path: string, passphrase: string): Promise<boolean>;
      newNode(path: string, name: string, email: string, passphrase: string, nbits?: number): Promise<boolean>;
      listNodes(unlockedOnly?: boolean): Promise<string[]>;
      deriveKey(nodePath: string, keyName: string, passphrase: string): Promise<boolean>;
      deleteKey(nodePath: string, keyName: string): Promise<boolean>;
      listKeys(nodePath: string): Promise<string[]>;
      getKey(nodePath: string, keyName: string): Promise<string>;
      getPrimaryKeyPair(nodePath: string, includePrivateKey?: boolean): Promise<{
          publicKey: string;
          privateKey: string;
      }>;
      signFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string): Promise<string>;
      verifyFile(nodePath: string, filePath: string, signaturePath?: string): Promise<boolean>;
      encryptFile(nodePath: string, filePath: string, publicKeyPath?: string): Promise<string>;
      decryptFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string): Promise<string>;
      listVaults(nodePath: string): Promise<string[]>;
      newVault(nodePath: string, vaultName: string): Promise<boolean>;
      destroyVault(nodePath: string, vaultName: string): Promise<boolean>;
      listSecrets(nodePath: string, vaultName: string): Promise<string[]>;
      createSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer): Promise<boolean>;
      destroySecret(nodePath: string, vaultName: string, secretName: string): Promise<boolean>;
      getSecret(nodePath: string, vaultName: string, secretName: string): Promise<Buffer>;
      updateSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer): Promise<boolean>;
      getAgentStatus(): Promise<string>;
      stopAgent(): Promise<boolean>;
  }
  export default PolykeyClient;

}
declare module '@matrixai/polykey/src/lib/agent/internal/daemon-script' {
  export {};

}
declare module '@matrixai/polykey/src/lib/git/GitBackend' {
  /// <reference types="node" />
  import VaultManager from '@matrixai/polykey/src/lib/vaults/VaultManager';
  class GitBackend {
      private polykeyPath;
      private vaultManager;
      constructor(polykeyPath: string, vaultManager: VaultManager);
      /**
       * Find out whether vault exists.
       * @param vaultName Name of vault to check
       * @param publicKey Public key of peer trying to access vault
       */
      private exists;
      handleInfoRequest(vaultName: string): Promise<Buffer>;
      handlePackRequest(vaultName: string, body: Buffer): Promise<Buffer>;
      private createGitPacketLine;
  }
  export default GitBackend;

}
declare module '@matrixai/polykey/src/lib/git/GitClient' {
  import { Address } from '@matrixai/polykey/src/lib/peers/PeerInfo';
  import KeyManager from '@matrixai/polykey/src/lib/keys/KeyManager';
  /**
   * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
   */
  class GitClient {
      private client;
      private credentials;
      constructor(address: Address, keyManager: KeyManager);
      /**
       * The custom http request method to feed into isomorphic-git's [custom http object](https://isomorphic-git.org/docs/en/http)
       */
      request({ url, method, headers, body, onProgress }: {
          url: any;
          method: any;
          headers: any;
          body: any;
          onProgress: any;
      }): Promise<any>;
      /**
       * Requests remote info from the connected peer for the named vault.
       * @param vaultName Name of the desired vault
       */
      private requestInfo;
      /**
       * Requests a pack from the connected peer for the named vault.
       * @param vaultName Name of the desired vault
       */
      private requestPack;
      /**
       * Converts a buffer into an iterator expected by isomorphic git.
       * @param data Data to be turned into an iterator
       */
      private iteratorFromData;
  }
  export default GitClient;

}
declare module '@matrixai/polykey/src/lib/git/pack-objects/GitCommit' {
  /// <reference types="node" />
  class GitCommit {
      _commit: string;
      constructor(commit: any);
      static fromPayloadSignature({ payload, signature }: {
          payload: any;
          signature: any;
      }): GitCommit;
      static from(commit: any): GitCommit;
      toObject(): Buffer;
      headers(): any;
      message(): any;
      parse(): any;
      static justMessage(commit: any): any;
      static justHeaders(commit: any): any;
      parseHeaders(): any;
      static renderHeaders(obj: any): string;
      static render(obj: any): string;
      render(): string;
      withoutSignature(): any;
      isolateSignature(): any;
  }
  export default GitCommit;

}
declare module '@matrixai/polykey/src/lib/git/pack-objects/GitObject' {
  /// <reference types="node" />
  class GitObject {
      static hash({ type, object }: {
          type: any;
          object: any;
      }): any;
      static wrap({ type, object }: {
          type: any;
          object: any;
      }): {
          oid: any;
          buffer: Buffer;
      };
      static unwrap({ oid, buffer }: {
          oid: any;
          buffer: any;
      }): {
          type: any;
          object: Buffer;
      };
  }
  export default GitObject;

}
declare module '@matrixai/polykey/src/lib/git/pack-objects/GitObjectManager' {
  import { EncryptedFS } from 'encryptedfs';
  class GitObjectManager {
      static read(fileSystem: EncryptedFS, gitdir: string, oid: string, format?: string): Promise<any>;
  }
  export default GitObjectManager;

}
declare module '@matrixai/polykey/src/lib/git/pack-objects/GitTree' {
  /// <reference types="node" />
  class GitTree {
      _entries: any[];
      constructor(entries: any);
      static from(tree: any): GitTree;
      render(): string;
      toObject(): Buffer;
      entries(): any[];
      [Symbol.iterator](): Generator<any, void, unknown>;
  }
  export default GitTree;

}
declare module '@matrixai/polykey/src/lib/git/pack-objects/log' {
  import { EncryptedFS } from 'encryptedfs';
  function logCommit(fileSystem: EncryptedFS, gitdir: string, oid: string, signing: boolean): Promise<any>;
  /**
   * Get commit descriptions from the git history
   *
   * @link https://isomorphic-git.github.io/docs/log.html
   */
  function log(fileSystem: EncryptedFS, dir: any, gitdir: string | undefined, ref: string | undefined, depth: any, since: any, // Date
  signing?: boolean): Promise<any[]>;
  export default log;
  export { logCommit };

}
declare module '@matrixai/polykey/src/lib/git/pack-objects/packObjects' {
  import { EncryptedFS } from 'encryptedfs';
  import { PassThrough } from 'readable-stream';
  type Ack = {
      oid: string;
  };
  /**
   * Create a packfile stream
   *
   * @link https://isomorphic-git.github.io/docs/packObjects.html
   */
  function packObjects(fileSystem: EncryptedFS, dir: string, refs: string[], depth?: number, haves?: string[]): Promise<{
      packstream: PassThrough;
      shallows: Set<string>;
      unshallows: Set<unknown>;
      acks: Ack[];
  }>;
  function listObjects(fileSystem: EncryptedFS, dir: string, gitdir: string | undefined, oids: string[]): Promise<string[]>;
  function pack(fileSystem: EncryptedFS, dir: string, gitdir: string | undefined, oids: string[], outputStream: PassThrough): Promise<PassThrough>;
  export default packObjects;
  export { listObjects, pack };

}
declare module '@matrixai/polykey/src/lib/git/pack-objects/shasum' {
  /// <reference types="node" />
  function shasum(buffer: Buffer): any;
  export default shasum;

}
declare module '@matrixai/polykey/src/lib/git/side-band/GitSideBand' {
  import { PassThrough } from 'readable-stream';
  class GitSideBand {
      static demux(input: any): {
          packetlines: PassThrough;
          packfile: PassThrough;
          progress: PassThrough;
      };
      static mux(protocol: any, // 'side-band' or 'side-band-64k'
      packetlines: any, packfile: any, progress: any, error: any): PassThrough;
  }
  export default GitSideBand;

}
declare module '@matrixai/polykey/src/lib/git/upload-pack/GitPackedRefs' {
  type Config = {
      line: string;
      ref?: string;
      peeled?: string;
      oid?: string;
      comment?: boolean;
  };
  class GitPackedRefs {
      refs: Map<string, string>;
      parsedConfig: Config[];
      constructor(text: string);
      static from(text: any): GitPackedRefs;
  }
  export default GitPackedRefs;

}
declare module '@matrixai/polykey/src/lib/git/upload-pack/GitPktLine' {
  /**
  pkt-line Format
  ---------------

  Much (but not all) of the payload is described around pkt-lines.

  A pkt-line is a variable length binary string.  The first four bytes
  of the line, the pkt-len, indicates the total length of the line,
  in hexadecimal.  The pkt-len includes the 4 bytes used to contain
  the length's hexadecimal representation.

  A pkt-line MAY contain binary data, so implementors MUST ensure
  pkt-line parsing/formatting routines are 8-bit clean.

  A non-binary line SHOULD BE terminated by an LF, which if present
  MUST be included in the total length. Receivers MUST treat pkt-lines
  with non-binary data the same whether or not they contain the trailing
  LF (stripping the LF if present, and not complaining when it is
  missing).

  The maximum length of a pkt-line's data component is 65516 bytes.
  Implementations MUST NOT send pkt-line whose length exceeds 65520
  (65516 bytes of payload + 4 bytes of length data).

  Implementations SHOULD NOT send an empty pkt-line ("0004").

  A pkt-line with a length field of 0 ("0000"), called a flush-pkt,
  is a special case and MUST be handled differently than an empty
  pkt-line ("0004").

  ----
    pkt-line     =  data-pkt / flush-pkt

    data-pkt     =  pkt-len pkt-payload
    pkt-len      =  4*(HEXDIG)
    pkt-payload  =  (pkt-len - 4)*(OCTET)

    flush-pkt    = "0000"
  ----

  Examples (as C-style strings):

  ----
    pkt-line          actual value
    ---------------------------------
    "0006a\n"         "a\n"
    "0005a"           "a"
    "000bfoobar\n"    "foobar\n"
    "0004"            ""
  ----
  */
  /// <reference types="node" />
  class GitPktLine {
      static flush(): Buffer;
      static encode(line: any): Buffer;
      static streamReader(stream: any): () => Promise<any>;
  }
  export default GitPktLine;

}
declare module '@matrixai/polykey/src/lib/git/upload-pack/GitRefManager' {
  import { EncryptedFS } from 'encryptedfs';
  class GitRefManager {
      static packedRefs(fileSystem: EncryptedFS, gitdir: string): Promise<Map<string, string>>;
      static listRefs(fileSystem: EncryptedFS, gitdir: string, filepath: string): Promise<string[]>;
      static resolve(fileSystem: EncryptedFS, gitdir: string, ref: string, depth?: number): any;
  }
  export default GitRefManager;

}
declare module '@matrixai/polykey/src/lib/git/upload-pack/uploadPack' {
  /// <reference types="node" />
  import { EncryptedFS } from 'encryptedfs';
  function uploadPack(fileSystem: EncryptedFS, dir: string, gitdir?: string, advertiseRefs?: boolean): Promise<Buffer[] | undefined>;
  export default uploadPack;

}
declare module '@matrixai/polykey/src/lib/keys/KeyManager' {
  /// <reference types="node" />
  import fs from 'fs';
  import { Pool, ModuleThread } from 'threads';
  import { KeyManagerWorker } from '@matrixai/polykey/src/lib/keys/KeyManagerWorker';
  type KeyPair = {
      private: string | null;
      public: string | null;
  };
  type PKInfo = {
      key: Buffer | null;
      cert: Buffer | null;
      caCert: Buffer | null;
  };
  class KeyManager {
      private primaryKeyPair;
      private primaryIdentity?;
      private derivedKeys;
      private derivedKeysPath;
      private useWebWorkers;
      private workerPool?;
      polykeyPath: string;
      private fileSystem;
      private keypairPath;
      private metadataPath;
      private metadata;
      pkiInfo: PKInfo;
      constructor(polyKeyPath: string | undefined, fileSystem: typeof fs, useWebWorkers?: boolean, workerPool?: Pool<ModuleThread<KeyManagerWorker>>);
      get identityLoaded(): boolean;
      /**
       * Generates a new assymetric key pair (publicKey and privateKey).
       * @param name Name of keypair owner
       * @param email Email of keypair owner
       * @param passphrase Passphrase to lock the keypair
       * @param nbits Size of the new keypair
       * @param replacePrimary If true, the generated keypair becomes the new primary identity of the key manager
       * @param progressCallback A progress hook for keypair generation
       */
      generateKeyPair(name: string, email: string, passphrase: string, nbits?: number, replacePrimary?: boolean, progressCallback?: (info: any) => void): Promise<KeyPair>;
      /**
       * Get the primary keypair
       */
      getKeyPair(): KeyPair;
      /**
       * Determines whether public key is loaded or not
       */
      hasPublicKey(): boolean;
      /**
       * Get the public key of the primary keypair
       */
      getPublicKey(): string;
      /**
       * Get the private key of the primary keypair
       */
      getPrivateKey(): string;
      /**
       * Loads the keypair into the key manager as the primary identity
       * @param publicKey Public Key
       * @param privateKey Private Key
       */
      loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer): void;
      /**
       * Loads the private key into the primary keypair
       * @param privateKey Private Key
       */
      loadPrivateKey(privateKey: string | Buffer): void;
      /**
       * Loads the public key into the primary keypair
       * @param publicKey Public Key
       */
      loadPublicKey(publicKey: string | Buffer): void;
      /**
       * Loads the primary identity into the key manager from the existing keypair
       * @param passphrase Passphrase to unlock the private key
       */
      unlockIdentity(passphrase: string): Promise<void>;
      /**
       * Export the primary private key to a specified location
       * @param path Destination path
       */
      exportPrivateKey(path: string): void;
      /**
       * Export the primary public key to a specified location
       * @param path Destination path
       */
      exportPublicKey(path: string): void;
      /**
       * Asynchronously Generates a new symmetric key and stores it in the key manager
       * @param name Unique name of the generated key
       * @param passphrase Passphrase to derive the key from
       * @param storeKey Whether to store the key in the key manager
       */
      generateKey(name: string, passphrase: string, storeKey?: boolean): Promise<Buffer>;
      /**
       * Deletes a derived symmetric key from the key manager
       * @param name Name of the key to be deleted
       */
      deleteKey(name: string): Promise<boolean>;
      /**
       * List all keys in the current keymanager
       */
      listKeys(): string[];
      /**
       * Synchronously imports an existing key from file or Buffer
       * @param name Unique name of the imported key
       * @param key Key to be imported
       */
      importKeySync(name: string, key: string | Buffer): void;
      /**
       * Asynchronously imports an existing key from file or Buffer
       * @param name Unique name of the imported key
       * @param key Key to be imported
       */
      importKey(name: string, key: string | Buffer): Promise<void>;
      /**
       * Synchronously exports an existing key from file or Buffer
       * @param name Name of the key to be exported
       * @param dest Destination path
       * @param createPath If set to true, the path is recursively created
       */
      exportKeySync(name: string, dest: string, createPath?: boolean): void;
      /**
       * Asynchronously exports an existing key from file or Buffer
       * @param name Name of the key to be exported
       * @param dest Destination path
       * @param createPath If set to true, the path is recursively created
       */
      exportKey(name: string, dest: string, createPath?: boolean): Promise<void>;
      /**
       * Loads an identity from the given public key
       * @param publicKey Buffer containing the public key
       */
      getIdentityFromPublicKey(publicKey: Buffer): Promise<Object>;
      /**
       * Loads an identity from the given private key
       * @param publicKey Buffer containing the public key
       */
      getIdentityFromPrivateKey(privateKey: Buffer, passphrase: string): Promise<Object>;
      /**
       * Signs the given data with the provided key or the primary key if none is specified
       * @param data Buffer or file containing the data to be signed
       * @param privateKey Buffer containing the key to sign with. Defaults to primary private key if no key is given.
       * @param keyPassphrase Required if privateKey is provided.
       */
      signData(data: Buffer | string, privateKey?: Buffer, keyPassphrase?: string): Promise<Buffer>;
      /**
       * Signs the given file with the provided key or the primary key if none is specified
       * @param filePath Path to file containing the data to be signed
       * @param privateKey The key to sign with. Defaults to primary public key if no key is given.
       * @param keyPassphrase Required if privateKey is provided.
       */
      signFile(filePath: string, privateKey?: string | Buffer, keyPassphrase?: string): Promise<string>;
      /**
       * Verifies the given data with the provided key or the primary key if none is specified
       * @param data Buffer or file containing the data to be verified
       * @param signature The PGP signature
       * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
       */
      verifyData(data: Buffer | string, signature: Buffer, publicKey?: Buffer): Promise<boolean>;
      /**
       * Verifies the given file with the provided key or the primary key if none is specified
       * @param filePath Path to file containing the data to be verified
       * @param signaturePath The path to the file containing the PGP signature
       * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
       */
      verifyFile(filePath: string, signaturePath: string, publicKey?: string | Buffer): Promise<boolean>;
      /**
       * Encrypts the given data for a specific public key
       * @param data The data to be encrypted
       * @param publicKey The key to encrypt for
       */
      encryptData(data: Buffer, publicKey?: Buffer): Promise<string>;
      /**
       * Encrypts the given file for a specific public key
       * @param filePath Path to file containing the data to be encrypted
       * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
       */
      encryptFile(filePath: string, publicKey?: string | Buffer): Promise<string>;
      /**
       * Decrypts the given data with the provided key or the primary key if none is given
       * @param data The data to be decrypted
       * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
       * @param keyPassphrase Required if privateKey is provided.
       */
      decryptData(data: Buffer, privateKey?: Buffer, keyPassphrase?: string): Promise<Buffer>;
      /**
       * Decrypts the given file with the provided key or the primary key if none is given
       * @param filePath Path to file containing the data to be decrypted
       * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
       * @param keyPassphrase Required if privateKey is provided.
       */
      decryptFile(filePath: string, privateKey?: string | Buffer, keyPassphrase?: string): Promise<string>;
      get PKIInfo(): PKInfo;
      loadPKIInfo(key?: Buffer | null, cert?: Buffer | null, caCert?: Buffer | null, writeToFile?: boolean): void;
      /**
       * Get the key for a given name
       * @param name The unique name of the desired key
       */
      getKey(name: string): Buffer;
      /**
       * Determines if the Key Manager has a certain key
       * @param name The unique name of the desired key
       */
      hasKey(name: string): boolean;
      private writeMetadata;
      loadMetadata(): Promise<void>;
  }
  export default KeyManager;
  export { KeyPair };

}
declare module '@matrixai/polykey/src/lib/keys/KeyManagerWorker' {
  /// <reference types="node" />
  const keyManagerWorker: {
      /**
       * Signs the given data with the provided identity
       * @param data Buffer or file containing the data to be signed
       * @param identity Identity with which to sign with.
       */
      signData(data: string | Buffer, identity: any): Promise<Buffer>;
      /**
       * Verifies the given data with the provided identity
       * @param data Buffer or file containing the data to be verified
       * @param signature The PGP signature
       * @param identity Identity with which to verify with.
       */
      verifyData(data: string | Buffer, signature: Buffer, identity: any): Promise<boolean>;
      /**
       * Encrypts the given data for the provided identity
       * @param data The data to be encrypted
       * @param identity Identity to encrypt for
       */
      encryptData(data: Buffer, identity: any): Promise<string>;
      /**
       * Decrypts the given data with the provided identity
       * @param data The data to be decrypted
       * @param identity Identity to decrypt with
       */
      decryptData(data: Buffer, identity: any): Promise<Buffer>;
  };
  export type KeyManagerWorker = typeof keyManagerWorker;
  export {};

}
declare module '@matrixai/polykey/src/lib/keys/pki/PublicKeyInfrastructure' {
  /// <reference types="node" />
  import { pki } from 'node-forge';
  /**
   * This class manages X.509 certificates for secure and authenticated communication between peers.
   */
  class PublicKeyInfrastructure {
      static N_BITS: number;
      static COMMON_NAME: string;
      static ORGANIZATION_NAME: string;
      /**
       * Creates an X.509 certificate for transport layer security
       * @param nbits The number of bits for keypair generation
       * @param organizationName The name of the organization
       */
      static createX509Certificate(nbits?: number, commonName?: string, organizationName?: string, sign?: (cert: pki.Certificate) => pki.Certificate): {
          keyPem: Buffer;
          certPem: Buffer;
      };
  }
  export default PublicKeyInfrastructure;

}
declare module '@matrixai/polykey/src/lib/peers/MulticastBroadcaster' {
  /// <reference types="node" />
  import dgram from 'dgram';
  import PeerInfo from '@matrixai/polykey/src/lib/peers/PeerInfo';
  import { EventEmitter } from 'events';
  import KeyManager from '@matrixai/polykey/src/lib/keys/KeyManager';
  type PeerMessage = {
      encryptedLocalPubKey: Buffer;
      encryptedPeerPubKey: Buffer;
      rawRandomMessage: Buffer;
      encryptedRandomMessage: Buffer;
  };
  class MulticastBroadcaster extends EventEmitter {
      addPeer: (peerInfo: PeerInfo) => void;
      localPeerInfo: PeerInfo;
      keyManager: KeyManager;
      socket: dgram.Socket;
      interval: number;
      queryInterval: NodeJS.Timeout | null;
      peerPubKeyMessages: Map<string, PeerMessage>;
      constructor(addPeer: (peerInfo: PeerInfo) => void, localPeerInfo: PeerInfo, keyManager: KeyManager);
      /**
       * Request a peer contact for the multicast peer discovery to check for
       * @param publicKey Public key of the desired peer
       */
      requestPeerContact(publicKey: string): Promise<void>;
      private queryLAN;
      private handleHandshakeMessages;
  }
  export default MulticastBroadcaster;

}
declare module '@matrixai/polykey/src/lib/peers/PeerInfo' {
  /// <reference types="node" />
  import { AddressInfo } from 'net';
  class Address {
      ip: string;
      port: string;
      constructor(ip: string, port: string);
      /**
       * Create an address object from a address string
       * @param addressString Address string in the format of `${this.ip}:${this.port}`
       */
      static parse(addressString: string): Address;
      /**
       * Create an address object from a net.AddressInfo
       * @param addressInfo AddressInfo of desired address
       */
      static fromAddressInfo(addressInfo: AddressInfo): Address;
      /**
       * Convert address into string of format `${this.ip}:${this.port}`
       */
      toString(): string;
  }
  class PeerInfo {
      publicKey: string;
      addresses: Set<Address>;
      connectedAddr?: Address;
      constructor(pubKey: string, addresses?: string[], connectedAddr?: string);
      /**
       * Sets the main server address for the peer
       * @param address Main server address for peer
       */
      connect(address: Address): void;
      /**
       * Clears the main server address for the peer
       */
      disconnect(): void;
      get AdressStringList(): string[];
  }
  export default PeerInfo;
  export { Address };

}
declare module '@matrixai/polykey/src/lib/peers/PeerManager' {
  /// <reference types="node" />
  import fs from 'fs';
  import * as grpc from '@grpc/grpc-js';
  import GitClient from '@matrixai/polykey/src/lib/git/GitClient';
  import KeyManager from '@matrixai/polykey/src/lib/keys/KeyManager';
  import VaultManager from '@matrixai/polykey/src/lib/vaults/VaultManager';
  import PeerInfo, { Address } from '@matrixai/polykey/src/lib/peers/PeerInfo';
  import MulticastBroadcaster from '@matrixai/polykey/src/lib/peers/MulticastBroadcaster';
  interface SocialDiscovery {
      name: string;
      findUser(handle: string, service: string): Promise<string>;
  }
  class PeerManager {
      private fileSystem;
      private metadataPath;
      private metadata;
      private localPeerInfo;
      private peerStore;
      private keyManager;
      multicastBroadcaster: MulticastBroadcaster;
      private socialDiscoveryServices;
      server: grpc.Server;
      serverStarted: boolean;
      private gitBackend;
      private credentials;
      private peerConnections;
      constructor(polykeyPath: string | undefined, fileSystem: typeof fs, keyManager: KeyManager, vaultManager: VaultManager, peerInfo?: PeerInfo, socialDiscoveryServices?: SocialDiscovery[]);
      private requestInfo;
      private requestPack;
      /**
       * Get the peer info of the current keynode
       */
      getLocalPeerInfo(): PeerInfo;
      /**
       * Set the address of the active server
       * @param adress Address of active server
       */
      connectLocalPeerInfo(address: Address): void;
      /**
       * Add a peer's info to the peerStore
       * @param peerInfo Info of the peer to be added
       */
      addPeer(peerInfo: PeerInfo): void;
      /**
       * Retrieves a peer for the given public key
       * @param publicKey Public key of the desired peer
       */
      getPeer(publicKey: string): PeerInfo | null;
      /**
       * Determines if the peerStore contains the desired peer
       * @param publicKey Public key of the desired peer
       */
      hasPeer(pubKey: string): boolean;
      /**
       * Finds an existing peer using multicast peer discovery
       * @param publicKey Public key of the desired peer
       */
      findPubKey(publicKey: string): Promise<PeerInfo>;
      /**
       * Finds an existing peer given a social service and handle
       * @param handle Username or handle of the user (e.g. @john-smith)
       * @param service Service on which to search for the user (e.g. github)
       */
      findSocialUser(handle: string, service: string): Promise<PeerInfo>;
      /**
       * Get a secure connection to the peer
       * @param peer Public key of an existing peer or address of new peer
       */
      connectToPeer(peer: string | Address): GitClient;
      private writeMetadata;
      loadMetadata(): void;
  }
  export default PeerManager;
  export { SocialDiscovery };

}
declare module '@matrixai/polykey/src/lib/utils' {
  /**
   * Returns a 5 character long random string of lower case letters
   */
  function randomString(): string;
  /**
   * Gets the first promise fulfiled
   * @param ps List of promises
   */
  function firstPromiseFulfilled<T>(ps: Promise<T>[]): Promise<T[]>;
  export { randomString, firstPromiseFulfilled };

}
declare module '@matrixai/polykey/src/lib/vaults/Vault' {
  /// <reference types="node" />
  import GitClient from '@matrixai/polykey/src/lib/git/GitClient';
  import { EncryptedFS } from 'encryptedfs';
  class Vault {
      private key;
      name: string;
      private efs;
      vaultPath: string;
      private secrets;
      private sharedPubKeys;
      private metadataPath;
      private mutex;
      constructor(name: string, symKey: Buffer, baseDir: string);
      /**
       * Returns the Encrypted File System used for vault operations
       */
      get EncryptedFS(): EncryptedFS;
      /**
       * Determines whether a secret exists in the vault
       * @param secretName Name of desired secret
       */
      secretExists(secretName: string): boolean;
      /**
       * Adds a secret to the vault
       * @param secretName Name of new secret
       * @param secret Content of new secret
       */
      addSecret(secretName: string, secret: Buffer): Promise<void>;
      /**
       * Updates a secret in the vault
       * @param secretName Name of secret to be updated
       * @param secret Content of updated secret
       */
      updateSecret(secretName: string, secret: Buffer): Promise<void>;
      /**
       * Get a secret from the vault
       * @param secretName Name of secret to be retrieved
       */
      getSecret(secretName: string): Buffer | string;
      /**
       * [WARNING] Removes a secret from the vault
       * @param secretName Name of secret to be removed
       */
      removeSecret(secretName: string): Promise<void>;
      /**
       * Lists all the secrets currently in the vault
       */
      listSecrets(): string[];
      tagVault(): void;
      untagVault(): void;
      /**
       * Allows a particular public key to access the vault
       * @param publicKey Public key to share with
       */
      shareVault(publicKey: string): void;
      /**
       * Removes access to the vault for a particular public key
       * @param publicKey Public key to unshare with
       */
      unshareVault(publicKey: string): void;
      /**
       * Determines if a particular public key can access the vault
       * @param publicKey Public key to check
       */
      peerCanAccess(publicKey: string): boolean;
      /**
       * Pulls the vault from a specific address
       * @param address Address of polykey node that owns vault to be pulled
       * @param getSocket Function to get an active connection to provided address
       */
      pullVault(gitClient: GitClient): Promise<void>;
      getVaultHistory(depth?: number): Promise<string[]>;
      private writeMetadata;
      private loadMetadata;
      private commitChanges;
      private loadSecrets;
  }
  export default Vault;

}
declare module '@matrixai/polykey/src/lib/vaults/VaultManager' {
  /// <reference types="node" />
  import fs from 'fs';
  import Vault from '@matrixai/polykey/src/lib/vaults/Vault';
  import GitClient from '@matrixai/polykey/src/lib/git/GitClient';
  import KeyManager from '@matrixai/polykey/src/lib/keys/KeyManager';
  class VaultManager {
      polykeyPath: string;
      fileSystem: typeof fs;
      keyManager: KeyManager;
      metadataPath: string;
      vaults: Map<string, Vault>;
      vaultKeys: Map<string, Buffer>;
      constructor(polykeyPath: string | undefined, fileSystem: typeof fs, keyManager: KeyManager);
      /**
       * Get a vault from the vault manager
       * @param vaultName Name of desired vault
       */
      getVault(vaultName: string): Vault;
      /**
       * Get a vault from the vault manager
       * @param vaultName Unique name of new vault
       * @param key Optional key to use for the vault encryption, otherwise it is generated
       */
      createVault(vaultName: string, key?: Buffer): Promise<Vault>;
      /**
       * Get a vault from the vault manager
       * @param vaultName Name of vault to be cloned
       * @param address Address of polykey node that owns vault to be cloned
       * @param getSocket Function to get an active connection to provided address
       */
      cloneVault(vaultName: string, gitClient: GitClient): Promise<Vault>;
      /**
       * Determines whether the vault exists
       * @param vaultName Name of desired vault
       */
      vaultExists(vaultName: string): boolean;
      /**
       * [WARNING] Destroys a certain vault and all its secrets
       * @param vaultName Name of vault to be destroyed
       */
      destroyVault(vaultName: string): void;
      /**
       * List the names of all vaults in memory
       */
      listVaults(): string[];
      private validateVault;
      private writeMetadata;
      loadMetadata(): Promise<void>;
  }
  export default VaultManager;

}
declare module '@matrixai/polykey' {
  import main = require('@matrixai/Polykey');
  export = main;
}