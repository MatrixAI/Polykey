"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isomorphic_git_1 = __importDefault(require("isomorphic-git"));
const encryptedfs_1 = require("encryptedfs");
class Vault {
    constructor(name, symKey, baseDir) {
        // how do we create pub/priv key pair?
        // do we use the same gpg pub/priv keypair
        this.key = symKey;
        this.keyLen = symKey.length;
        // Set filesystem
        const vfsInstance = new (require('virtualfs')).VirtualFS;
        this.efs = new encryptedfs_1.EncryptedFS(this.key, vfsInstance, vfsInstance, fs_1.default, process);
        this.name = name;
        this.vaultPath = path_1.default.join(baseDir, name);
        // make the vault directory
        this.efs.mkdirSync(this.vaultPath, { recursive: true });
        this.secrets = new Map();
        this.loadSecrets();
        // Load metadata
        this.metadataPath = path_1.default.join(this.vaultPath, '.vault', 'metadata');
        this.loadMetadata();
    }
    /**
     * Returns the Encrypted File System used for vault operations
     */
    get EncryptedFS() {
        return this.efs;
    }
    /**
     * Determines whether a secret exists in the vault
     * @param secretName Name of desired secret
     */
    secretExists(secretName) {
        const secretPath = path_1.default.join(this.vaultPath, secretName);
        return this.secrets.has(secretName) && this.efs.existsSync(secretPath);
    }
    /**
     * Adds a secret to the vault
     * @param secretName Name of new secret
     * @param secret Content of new secret
     */
    async addSecret(secretName, secret) {
        // Check if secret already exists
        if (this.secrets.has(secretName)) {
            throw new Error('Secret already exists, try updating it instead.');
        }
        const writePath = path_1.default.join(this.vaultPath, secretName);
        // Write secret
        await this.efs.promises.writeFile(writePath, secret, {});
        // Update secrets map
        this.secrets.set(secretName, secret);
        // Auto commit message
        await this.commitChanges(`Add secret: ${secretName}`, secretName, 'added');
    }
    /**
     * Updates a secret in the vault
     * @param secretName Name of secret to be updated
     * @param secret Content of updated secret
     */
    async updateSecret(secretName, secret) {
        // Check if secret already exists
        if (!this.secrets.has(secretName)) {
            throw new Error('Secret does not exist, try adding it instead.');
        }
        const writePath = path_1.default.join(this.vaultPath, secretName);
        // Write secret
        await this.efs.promises.writeFile(writePath, secret, {});
        // Update secrets map
        this.secrets.set(secretName, secret);
        // Auto commit message
        await this.commitChanges(`Update secret: ${secretName}`, secretName, 'modified');
    }
    /**
     * Get a secret from the vault
     * @param secretName Name of secret to be retrieved
     */
    getSecret(secretName) {
        if (this.secrets.has(secretName)) {
            const secret = this.secrets.get(secretName);
            if (secret) {
                return secret;
            }
            else {
                const secretPath = path_1.default.join(this.vaultPath, secretName);
                // TODO: this should be async
                const secretBuf = this.efs.readFileSync(secretPath, {});
                this.secrets.set(secretName, secretBuf);
                return secretBuf;
            }
        }
        throw Error('Secret: ' + secretName + ' does not exist');
    }
    /**
     * [WARNING] Removes a secret from the vault
     * @param secretName Name of secret to be removed
     */
    async removeSecret(secretName) {
        if (this.secrets.has(secretName)) {
            const successful = this.secrets.delete(secretName);
            // Remove from fs
            await this.efs.promises.unlink(path_1.default.join(this.vaultPath, secretName));
            // Auto commit message
            await this.commitChanges(`Remove secret: ${secretName}`, secretName, 'removed');
            if (successful) {
                return;
            }
            throw Error('Secret: ' + secretName + ' was not removed');
        }
        throw Error('Secret: ' + secretName + ' does not exist');
    }
    /**
     * Lists all the secrets currently in the vault
     */
    listSecrets() {
        let secrets = Array.from(this.secrets.keys());
        return secrets;
    }
    tagVault() {
    }
    untagVault() {
    }
    /////////////
    // Sharing //
    /////////////
    /**
     * Allows a particular public key to access the vault
     * @param publicKey Public key to share with
     */
    shareVault(publicKey) {
        if (this.sharedPubKeys.has(name)) {
            throw new Error('Vault is already shared with given public key');
        }
        this.sharedPubKeys.add(publicKey);
        // Write metadata
        this.writeMetadata();
    }
    /**
     * Removes access to the vault for a particular public key
     * @param publicKey Public key to unshare with
     */
    unshareVault(publicKey) {
        if (!this.sharedPubKeys.has(publicKey)) {
            throw new Error('Vault is not shared with given public key');
        }
        this.sharedPubKeys.delete(publicKey);
        // Write metadata
        this.writeMetadata();
    }
    /**
     * Determines if a particular public key can access the vault
     * @param publicKey Public key to check
     */
    peerCanAccess(publicKey) {
        // return this.sharedPubKeys.has(publicKey)
        return true;
    }
    /**
     * Pulls the vault from a specific address
     * @param address Address of polykey node that owns vault to be pulled
     * @param getSocket Function to get an active connection to provided address
     */
    async pullVault(gitClient) {
        // Strangely enough this is needed for pulls along with ref set to 'HEAD'
        // In isogit's documentation, this is just to get the currentBranch name
        // But it solves a bug whereby if not used, git.pull complains that it can't
        // find the master branch or HEAD
        await isomorphic_git_1.default.currentBranch({
            fs: { promises: this.efs.promises },
            dir: this.vaultPath,
            fullname: true
        });
        // First pull
        await isomorphic_git_1.default.pull({
            fs: { promises: this.efs.promises },
            http: gitClient,
            dir: this.vaultPath,
            url: "http://" + '0.0.0.0:0' + '/' + this.name,
            ref: 'HEAD',
            singleBranch: true,
            author: {
                name: this.name
            }
        });
        // Load any new secrets
        this.loadSecrets();
    }
    /**
     * Initializes the git repository for new vaults
     */
    async initRepository() {
        const fileSystem = this.efs;
        await isomorphic_git_1.default.init({
            fs: fileSystem,
            dir: this.vaultPath
        });
        // Initial commit
        await isomorphic_git_1.default.commit({
            fs: fileSystem,
            dir: this.vaultPath,
            author: {
                name: this.name
            },
            message: "init commit"
        });
        // Write packed-refs file because isomorphic git goes searching for it
        // and apparently its not autogenerated
        this.efs.writeFileSync(path_1.default.join(this.vaultPath, '.git', 'packed-refs'), '# pack-refs with: peeled fully-peeled sorted');
    }
    // ============== Helper methods ============== //
    writeMetadata() {
        // mkdir first
        this.efs.mkdirSync(path_1.default.dirname(this.metadataPath), { recursive: true });
        // Create and write metadata
        const metadata = {
            sharedPubKeys: Array.from(this.sharedPubKeys.keys())
        };
        this.efs.writeFileSync(this.metadataPath, JSON.stringify(metadata));
    }
    loadMetadata() {
        if (this.efs.existsSync(this.metadataPath)) {
            const fileContents = this.efs.readFileSync(this.metadataPath).toString();
            const metadata = JSON.parse(fileContents);
            this.sharedPubKeys = new Set(metadata.sharedPubKeys);
        }
        else {
            // Need to create it
            this.sharedPubKeys = new Set();
            this.writeMetadata();
        }
    }
    async commitChanges(message, secretName, action) {
        if (action == 'removed') {
            await isomorphic_git_1.default.remove({
                fs: this.efs,
                dir: this.vaultPath,
                filepath: secretName
            });
        }
        else {
            await isomorphic_git_1.default.add({
                fs: this.efs,
                dir: this.vaultPath,
                filepath: secretName
            });
        }
        return await isomorphic_git_1.default.commit({
            fs: this.efs,
            dir: this.vaultPath,
            author: {
                name: this.name
            },
            message: message
        });
    }
    loadSecrets() {
        const secrets = fs_1.default.readdirSync(this.vaultPath, undefined);
        for (const secret of secrets.filter((s) => s[0] != '.')) {
            this.secrets.set(secret, null);
        }
    }
}
exports.default = Vault;
//# sourceMappingURL=Vault.js.map