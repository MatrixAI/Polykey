"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Vault_1 = __importDefault(require("@polykey/Vault"));
const crypto_1 = __importDefault(require("crypto"));
const jsonfile_1 = __importDefault(require("jsonfile"));
const KeyManager_1 = require("@polykey/KeyManager");
const vaultKeySize = 128 / 8; // in bytes
class Polykey {
    constructor(km, polykeyPath = `${os_1.default.homedir()}/.polykey`) {
        this.km = km || new KeyManager_1.KeyManager(this.polykeyPath);
        this.polykeyPath = polykeyPath;
        this.metadataPath = path_1.default.join(this.polykeyPath, 'metadata');
        // Set file system
        this.fs = fs_1.default;
        // Initialize reamining members
        this.vaults = new Map();
        this.metadata = {
            vaults: {},
            publicKeyPath: null,
            privateKeyPath: null,
            passphrase: null
        };
        // sync with polykey directory
        this.initSync();
    }
    static get KeyManager() {
        return KeyManager_1.KeyManager;
    }
    async fileExists(path) {
        return this.fs.existsSync(path);
    }
    fileExistsSync(path) {
        return this.fs.existsSync(path);
    }
    /////////////
    // Secrets //
    /////////////
    async secretExists(vaultName, secretName) {
        const vault = await this.getVault(vaultName);
        const secretExists = vault.secretExists(secretName);
        return secretExists;
    }
    async addSecret(vaultName, secretName, secret) {
        let vault;
        try {
            vault = await this.getVault(vaultName);
            vault.addSecret(secretName, secret);
        }
        catch (err) {
            throw err;
        }
    }
    async removeSecret(vaultName, secretName) {
        let vault;
        try {
            vault = await this.getVault(vaultName);
            vault.removeSecret(secretName);
        }
        catch (err) {
            throw err;
        }
    }
    async getSecret(vaultName, secretName) {
        let vault;
        let secret;
        try {
            vault = await this.getVault(vaultName);
            secret = vault.getSecret(secretName);
        }
        catch (err) {
            throw err;
        }
        return secret;
    }
    async copySecret(vaultName, secretName) {
        let vault;
        let secret;
        try {
            vault = await this.getVault(vaultName);
            secret = vault.getSecret(secretName);
        }
        catch (err) {
            throw err;
        }
        return secret;
    }
    /////////////
    // Vaults //
    /////////////
    async createVault(vaultName, key = undefined) {
        const path = path_1.default.join(this.polykeyPath, vaultName);
        let vaultExists;
        try {
            vaultExists = await this.fileExists(path);
        }
        catch (err) {
            throw err;
        }
        if (vaultExists) {
            throw Error('Vault already exists!');
        }
        try {
            // Directory not present, create one
            this.fs.mkdirSync(path, { recursive: true });
            // Create key if not provided
            let vaultKey;
            if (key === undefined) {
                // Generate new key
                vaultKey = Buffer.from(crypto_1.default.randomBytes(vaultKeySize));
            }
            else {
                // Assign key if it is provided
                vaultKey = key;
            }
            this.metadata.vaults[vaultName] = { key: vaultKey, tags: [] };
            await this.writeMetadata();
            const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath);
            this.vaults.set(vaultName, vault);
            return await this.getVault(vaultName);
        }
        catch (err) {
            // Delete vault dir and garbage collect
            await this.destroyVault(vaultName);
            throw err;
        }
    }
    async vaultExists(vaultName) {
        const path = path_1.default.join(this.polykeyPath, vaultName);
        const vaultExists = this.fs.existsSync(path);
        return vaultExists;
    }
    async destroyVault(vaultName) {
        // this is convenience function for removing all tags
        // and triggering garbage collection
        // destruction is a better word as we should ensure all traces is removed
        const path = path_1.default.join(this.polykeyPath, vaultName);
        // Remove directory on file system
        if (this.fs.existsSync(path)) {
            this.fs.rmdirSync(path, { recursive: true });
        }
        // Remaining garbage collection:
        // Remove vault from vaults map
        if (this.vaults.has(vaultName)) {
            this.vaults.delete(vaultName);
        }
        // Remove from metadata
        if (this.metadata.vaults.hasOwnProperty(vaultName)) {
            delete this.metadata.vaults[vaultName];
            await this.writeMetadata();
        }
        const vaultPathExists = this.fs.existsSync(path);
        if (vaultPathExists) {
            throw (Error('Vault path could not be destroyed!'));
        }
        const vaultEntryExists = this.vaults.has(vaultName);
        if (vaultEntryExists) {
            throw (Error('Vault could not be removed from PolyKey!'));
        }
        const metaDataHasVault = this.metadata.vaults.hasOwnProperty(vaultName);
        if (metaDataHasVault) {
            throw (Error('Vault metadata could not be destroyed!'));
        }
    }
    async importKeyPair(privateKeyPath, publicKeyPath, passphrase = '') {
        await this.km.loadKeyPair(privateKeyPath, publicKeyPath, passphrase);
        this.metadata.publicKeyPath = publicKeyPath;
        this.metadata.privateKeyPath = privateKeyPath;
        this.metadata.passphrase = passphrase;
        this.writeMetadata();
    }
    /* Validates whether all the artefacts needed to operate
    * a Vault are present. Namely this the vault directory
    * and the metadata for the vault containg the key
    */
    async validateVault(vaultName) {
        const existsMeta = this.metadata.vaults.hasOwnProperty(vaultName);
        if (!existsMeta) {
            throw Error('Vault metadata does not exist');
        }
        const vaultPath = path_1.default.join(this.polykeyPath, vaultName);
        const existsFS = await this.fileExists(vaultPath);
        if (!existsFS) {
            throw Error('Vault directory does not exist');
        }
    }
    removeItem() {
    }
    listItems() {
    }
    listVaults() {
        return Array.from(this.vaults.keys());
    }
    async listSecrets(vaultName) {
        const vault = await this.getVault(vaultName);
        return vault.listSecrets();
    }
    async verifyFile(filePath, signaturePath, publicKey = undefined) {
        try {
            // Get key if provided
            let keyBuffer;
            if (publicKey !== undefined) {
                if (typeof publicKey === 'string') { // Path
                    // Read in from fs
                    keyBuffer = Buffer.from(this.fs.readFileSync(publicKey));
                }
                else { // Buffer
                    keyBuffer = publicKey;
                }
            }
            else {
                // Load keypair into KeyManager from metadata
                const publicKeyPath = this.metadata.publicKeyPath;
                const privateKeyPath = this.metadata.privateKeyPath;
                const passphrase = this.metadata.passphrase;
                if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
                    await this.km.loadKeyPair(privateKeyPath, publicKeyPath, passphrase);
                }
            }
            // Read in file buffer and signature
            const fileBuffer = Buffer.from(this.fs.readFileSync(filePath, undefined));
            const signatureBuffer = Buffer.from(this.fs.readFileSync(signaturePath, undefined));
            const verified = await this.km.verifyData(fileBuffer, signatureBuffer, keyBuffer);
            return verified;
        }
        catch (err) {
            throw (err);
        }
    }
    async signFile(path, privateKey = undefined, privateKeyPassphrase = undefined) {
        try {
            // Get key if provided
            let keyBuffer;
            if (privateKey !== undefined) {
                if (typeof privateKey === 'string') { // Path
                    // Read in from fs
                    keyBuffer = Buffer.from(this.fs.readFileSync(privateKey));
                }
                else { // Buffer
                    keyBuffer = privateKey;
                }
            }
            else {
                // Load keypair into KeyManager from metadata
                const publicKeyPath = this.metadata.publicKeyPath;
                const privateKeyPath = this.metadata.privateKeyPath;
                const passphrase = this.metadata.passphrase;
                if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
                    await this.km.loadKeyPair(privateKeyPath, publicKeyPath, passphrase);
                }
            }
            // Read file into buffer
            const buffer = Buffer.from(this.fs.readFileSync(path, undefined));
            // Sign the buffer
            const signedBuffer = await this.km.signData(buffer, keyBuffer, privateKeyPassphrase);
            // Write buffer to signed file
            const signedPath = `${path}.sig`;
            this.fs.writeFileSync(signedPath, signedBuffer);
            return signedPath;
        }
        catch (err) {
            throw (Error(`failed to sign file: ${err}`));
        }
    }
    // P2P operations
    async beginPolyKeyDaemon() {
        // const repos = new Git(this.polykeyPath, this.fs, {
        //   fs: this.fs,
        //   autoCreate: false
        // });
        // const port = 7005;
        // repos.on('push', (push) => {
        //     console.log(`push ${push.repo}/${push.commit} (${push.branch})`);
        //     push.accept();
        // });
        // repos.on('fetch', (fetch) => {
        //   console.log(`fetch ${fetch.commit}`);
        //   fetch.accept();
        // });
        // repos.listen(port, null, () => {
        //     console.log(`node-git-server running at http://localhost:${port}`)
        // })
        // return `ip4/127.0.0.1/tcp/${port}`
    }
    tagVault() {
    }
    untagVault() {
    }
    shareVault() {
    }
    unshareVault() {
    }
    /* ============ HELPERS =============== */
    async writeMetadata() {
        try {
            await jsonfile_1.default.writeFile(this.metadataPath, this.metadata);
        }
        catch (err) {
            throw Error("Error writing vault key to config file");
        }
    }
    async getVault(vaultName) {
        if (this.vaults.has(vaultName)) {
            const vault = this.vaults.get(vaultName);
            if (vault) {
                return vault;
            }
        }
        // vault not in map, create new instance
        try {
            await this.validateVault(vaultName);
        }
        catch (err) {
            throw err;
        }
        const vaultKey = this.metadata.vaults[vaultName].key;
        const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath);
        this.vaults.set(vaultName, vault);
        return vault;
    }
    async getNodeAddrs() {
        let nodeAddr = [];
        // console.log('where is the repo?');
        // console.log(await this.node.repo.stat())
        const addr = await this.node.id();
        addr.addresses.forEach((ma) => {
            nodeAddr.push(`${ma.toString()}`);
        });
        return nodeAddr;
    }
    initSync() {
        // check if .polykey exists
        //  make folder if doesn't
        if (!this.fs.existsSync(this.polykeyPath)) {
            this.fs.mkdirSync(this.polykeyPath, { recursive: true });
            const metadataTemplate = {
                vaults: {},
                publicKeyPath: null,
                privateKeyPath: null,
                passphrase: null
            };
            jsonfile_1.default.writeFileSync(this.metadataPath, metadataTemplate);
            this.metadata = metadataTemplate;
        }
        else if (this.fs.existsSync(this.metadataPath)) {
            this.metadata = jsonfile_1.default.readFileSync(this.metadataPath);
        }
        // Load all of the vaults into memory
        for (const vaultName in this.metadata.vaults) {
            if (this.metadata.vaults.hasOwnProperty(vaultName)) {
                const path = path_1.default.join(this.polykeyPath, vaultName);
                if (this.fileExistsSync(path)) {
                    try {
                        const vaultKey = Buffer.from(this.metadata.vaults[vaultName].key);
                        const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath);
                        this.vaults.set(vaultName, vault);
                    }
                    catch (err) {
                        throw (err);
                    }
                }
            }
        }
    }
    loadKey(path) {
        if (path instanceof Buffer) {
            return path;
        }
        const keyBuf = Buffer.from(this.fs.readFileSync(path, undefined));
        return keyBuf;
    }
}
exports.default = Polykey;
//# sourceMappingURL=Polykey.js.map