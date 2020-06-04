declare module 'polykey/src/cli/Config' {
  import commander from 'commander';
  function makeConfigCommand(): commander.Command;
  export default makeConfigCommand;

}
declare module 'polykey/src/cli/Crypto' {
  import commander from 'commander';
  function makeCryptoCommand(): commander.Command;
  export default makeCryptoCommand;

}
declare module 'polykey/src/cli/KeyManager' {
  import commander from 'commander';
  function makeKeyManagerCommand(): commander.Command;
  export default makeKeyManagerCommand;

}
declare module 'polykey/src/cli/Node' {
  import commander from 'commander';
  function makeNodeCommand(): commander.Command;
  export default makeNodeCommand;

}
declare module 'polykey/src/cli/Secrets' {
  import commander from 'commander';
  function makeSecretsCommand(): commander.Command;
  export default makeSecretsCommand;

}
declare module 'polykey/src/cli/Vaults' {
  import commander from 'commander';
  function makeVaultsCommand(): commander.Command;
  export default makeVaultsCommand;

}
declare module 'polykey/src/cli/initPolykey' {
  import PolyKey from 'polykey/src/lib/Polykey';
  /*******************************************/
  function initPolyKey(): Promise<PolyKey>;
  export default initPolyKey;

}
declare module 'polykey/src/cli/polykey' {
  function actionRunner(fn: (...args: any[]) => Promise<void>): (...args: any[]) => Promise<void>;
  /*******************************************/
  enum PKMessageType {
      SUCCESS = 0,
      INFO = 1,
      WARNING = 2
  }
  function pkLogger(message: string, type?: PKMessageType): void;
  export { actionRunner, PKMessageType, pkLogger };

}
declare module 'polykey/src/lib/KeyManager' {
  /// <reference types="node" />
  import { Pool, ModuleThread } from 'threads';
  import { KeyManagerWorker } from '@polykey/KeyManagerWorker';
  type KeyPair = {
      private: string;
      public: string;
      passphrase: string;
  };
  class KeyManager {
      private primaryKeyPair;
      private primaryPassphrase?;
      private primaryIdentity?;
      private derivedKeys;
      private useWebWorkers;
      private workerPool?;
      storePath: string;
      constructor(polyKeyPath?: string, useWebWorkers?: boolean, workerPool?: Pool<ModuleThread<KeyManagerWorker>>);
      generateKeyPair(name: string, email: string, passphrase: string, replacePrimary?: boolean, progressCallback?: (info: any) => void): Promise<KeyPair>;
      getKeyPair(): KeyPair;
      getPublicKey(): string;
      getPrivateKey(): string;
      loadPrivateKey(privateKey: string | Buffer, passphrase?: string): Promise<void>;
      loadPublicKey(publicKey: string | Buffer): Promise<void>;
      loadIdentity(passphrase: string): Promise<void>;
      loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer, passphrase?: string): Promise<void>;
      exportPrivateKey(path: string): Promise<void>;
      exportPublicKey(path: string): Promise<void>;
      generateKeySync(name: string, passphrase: string): Buffer;
      generateKey(name: string, passphrase: string): Promise<Buffer>;
      importKeySync(name: string, key: string | Buffer): void;
      importKey(name: string, key: string | Buffer): Promise<void>;
      exportKey(name: string, path: string, createPath?: boolean): Promise<void>;
      exportKeySync(path: string, createPath?: boolean): void;
      getIdentityFromPublicKey(pubKey: Buffer): Promise<Object>;
      getIdentityFromPrivateKey(privKey: Buffer, passphrase: string): Promise<Object>;
      signData(data: Buffer | string, withKey?: Buffer, keyPassphrase?: string): Promise<Buffer>;
      verifyData(data: Buffer | string, signature: Buffer, withKey?: Buffer): Promise<string>;
      verifyFile(filePath: string, signaturePath: string, publicKey?: string | Buffer): Promise<string>;
      signFile(path: string, privateKey?: string | Buffer, privateKeyPassphrase?: string): Promise<string>;
      encryptData(data: Buffer, forPubKey: Buffer): Promise<string>;
      decryptData(data: string, withKey?: Buffer): Promise<Buffer>;
      getKey(name: string): Buffer;
      isLoaded(): boolean;
  }
  export default KeyManager;
  export { KeyPair };

}
declare module 'polykey/src/lib/KeyManagerWorker' {
  /// <reference types="node" />
  const keyManagerWorker: {
      signData(data: string | Buffer, identity: any): Promise<Buffer>;
      verifyData(data: string | Buffer, signature: Buffer, identity: any): Promise<string>;
      encryptData(data: Buffer, identity: any): Promise<string>;
      decryptData(data: string, identity: any): Promise<Buffer>;
  };
  export type KeyManagerWorker = typeof keyManagerWorker;
  export {};

}
declare module 'polykey/src/lib/P2P/MulticastBroadcaster' {
  /// <reference types="node" />
  import dgram from 'dgram';
  import { EventEmitter } from 'events';
  import KeyManager from '@polykey/KeyManager';
  import PeerStore from '@polykey/PeerStore/PeerStore';
  type PeerMessage = {
      encryptedLocalPubKey: Buffer;
      encryptedPeerPubKey: Buffer;
      rawRandomMessage: Buffer;
      encryptedRandomMessage: Buffer;
  };
  class MulticastBroadcaster extends EventEmitter {
      peerStore: PeerStore;
      keyManager: KeyManager;
      socket: dgram.Socket;
      interval: number;
      queryInterval: NodeJS.Timeout | null;
      peerPubKeyMessages: Map<string, PeerMessage>;
      constructor(peerStore: PeerStore, keyManager: KeyManager);
      queryLAN(): NodeJS.Timeout;
      /**
       * Start sending queries to the LAN.
       *
       * @returns {void}
       */
      start(): Promise<void>;
      private handleHandshakeMessages;
      requestPeerContact(pubKey: string): Promise<void>;
      /**
       * Stop sending queries to the LAN.
       *
       * @returns {Promise}
       */
      stop(): Promise<void>;
  }
  export default MulticastBroadcaster;

}
declare module 'polykey/src/lib/P2P/PeerDiscovery' {
  import KeyManager from "@polykey/KeyManager";
  import PeerInfo from "@polykey/PeerStore/PeerInfo";
  import PeerStore from "@polykey/PeerStore/PeerStore";
  import MulticastBroadcaster from "@polykey/P2P/MulticastBroadcaster";
  interface SocialDiscovery {
      name: string;
      findUser(handle: string, service: string): Promise<string>;
  }
  class PeerDiscovery {
      peerStore: PeerStore;
      keyManager: KeyManager;
      multicastBroadcaster: MulticastBroadcaster;
      private socialDiscoveryServices;
      constructor(peerStore: PeerStore, keyManager: KeyManager, socialDiscoveryServices?: SocialDiscovery[]);
      start(): Promise<void>;
      stop(): Promise<void>;
      findPubKey(pubKey: string): Promise<PeerInfo>;
      findSocialUser(handle: string, service: string): Promise<PeerInfo>;
  }
  export default PeerDiscovery;
  export { SocialDiscovery };

}
declare module 'polykey/src/lib/PeerStore/PeerInfo' {
  class Address {
      ip: string;
      port: string;
      constructor(ip: string, port: string);
      static parse(addr: string): Address;
  }
  class PeerInfo {
      publicKey: string;
      addresses: Set<Address>;
      connectedAddr?: Address;
      constructor(pubKey: string, addresses?: string[], connectedAddr?: string);
      connect(address: Address): void;
      disconnect(): void;
  }
  export default PeerInfo;
  export { Address };

}
declare module 'polykey/src/lib/PeerStore/PeerStore' {
  import PeerInfo from "@polykey/PeerStore/PeerInfo";
  /**
   * Responsible for managing known peers, as well as their addresses and metadata
   */
  class PeerStore {
      localPeerInfo: PeerInfo;
      peers: Map<string, PeerInfo>;
      constructor(peerInfo: PeerInfo);
      /**
       * Stores the peerInfo of a new peer.
       * If already exist, its info is updated.
       */
      put(peerInfo: PeerInfo): void;
      /**
       * Add a new peer to the store.
       */
      add(peerInfo: PeerInfo): void;
      /**
       * Updates an already known peer.
       */
      update(peerInfo: PeerInfo): void;
      /**
       * Get the info to the given id.
       */
      get(pubKey: string): PeerInfo | null;
      /**
       * Has the info to the given id.
       */
      has(pubKey: string): boolean;
  }
  export default PeerStore;

}
declare module 'polykey/src/lib/Polykey' {
  /// <reference types="node" />
  import Vault from '@polykey/Vault';
  import KeyManager from '@polykey/KeyManager';
  import PeerStore from '@polykey/PeerStore/PeerStore';
  import PeerDiscovery from '@polykey/P2P/PeerDiscovery';
  class Polykey {
      polykeyPath: string;
      private fs;
      private vaults;
      private metadata;
      private metadataPath;
      keyManager: KeyManager;
      peerStore: PeerStore;
      peerDiscovery: PeerDiscovery;
      constructor(keyManager?: KeyManager, peerDiscovery?: PeerDiscovery, polykeyPath?: string);
      getVault(vaultName: string): Promise<Vault>;
      createVault(vaultName: string, key?: Buffer): Promise<Vault>;
      vaultExists(vaultName: string): Promise<boolean>;
      destroyVault(vaultName: string): Promise<void>;
      private validateVault;
      listVaults(): string[];
      tagVault(): void;
      untagVault(): void;
      shareVault(): void;
      unshareVault(): void;
      private writeMetadata;
  }
  export default Polykey;

}
declare module 'polykey/src/lib/RPC/RPCMessage' {
  /// <reference types="node" />
  import { Root } from 'protobufjs';
  import PeerInfo from '@polykey/PeerStore/PeerInfo';
  type HandshakeMessage = {
      targetPubKey: Buffer;
      requestingPubKey: Buffer;
      message: Buffer;
      responsePeerInfo?: PeerInfo;
  };
  class RPCMessage {
      static loadProto(name: string): Root;
      static encodePeerInfo(peerInfo: PeerInfo): Uint8Array;
      static decodePeerInfo(buffer: Uint8Array): PeerInfo;
      static encodeHandshakeMessage(targetPubKey: Buffer, requestingPubKey: Buffer, messageBuf: Buffer, responsePeerInfo?: PeerInfo): Uint8Array;
      static decodeHandshakeMessage(buffer: Uint8Array): HandshakeMessage;
  }
  export default RPCMessage;

}
declare module 'polykey/src/lib/Vault' {
  /// <reference types="node" />
  class Vault {
      private key;
      private keyLen;
      name: string;
      private fs;
      private secrets;
      private vaultPath;
      constructor(name: string, symKey: Buffer, baseDir: string);
      loadSecrets(): void;
      genSymKey(asymKey: Buffer, keyLen: number): Buffer;
      secretExists(secretName: string): boolean;
      addSecret(secretName: string, secretBuf: Buffer): void;
      getSecret(secretName: string): Buffer | string;
      removeSecret(secretName: string): void;
      listSecrets(): string[];
      tagVault(): void;
      untagVault(): void;
      shareVault(): void;
      unshareVault(): void;
  }
  export default Vault;

}
declare module 'polykey/src/lib/index' {
  export { default } from '@polykey/Polykey';

}
declare module 'polykey/src/lib/utils' {
  function randomString(): string;
  function firstPromiseFulfilled<T>(ps: Promise<T>[]): Promise<T[]>;
  export { randomString, firstPromiseFulfilled };

}
declare module 'polykey/tests/P2P/PeerDiscovery.test' {
  export {};

}
declare module 'polykey/tests/Polykey.test' {
  export {};

}
declare module 'polykey/tests/RPC/RPCMessage.test' {
  export {};

}
declare module 'polykey/tests/Vaults.test' {
  export {};

}
declare module 'polykey' {
  import main = require('polykey/src/lib/index');
  export = main;
}