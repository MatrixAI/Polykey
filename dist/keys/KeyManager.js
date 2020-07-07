"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const kbpgp_1 = __importDefault(require("kbpgp"));
const crypto_1 = __importDefault(require("crypto"));
const util_1 = require("util");
class KeyManager {
    constructor(polyKeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, passphrase, useWebWorkers = false, workerPool) {
        this.primaryKeyPair = { private: null, public: null };
        this.metadata = {
            privateKeyPath: null,
            publicKeyPath: null,
            pkiKeyPath: null,
            pkiCertPath: null,
            caCertPath: null,
        };
        /////////
        // PKI //
        /////////
        this.pkiInfo = { key: null, cert: null, caCert: null };
        this.useWebWorkers = useWebWorkers;
        this.workerPool = workerPool;
        this.derivedKeys = new Map();
        this.fileSystem = fileSystem;
        // Load key manager metadata
        this.polykeyPath = polyKeyPath;
        const keypairPath = path_1.default.join(polyKeyPath, '.keypair');
        if (!this.fileSystem.existsSync(keypairPath)) {
            this.fileSystem.mkdirSync(keypairPath);
        }
        this.metadataPath = path_1.default.join(keypairPath, 'metadata');
        this.loadMetadata();
        // Load keys if they were provided
        if (this.metadata.privateKeyPath && this.metadata.publicKeyPath && passphrase) {
            // Load files into memory
            const publicKey = this.fileSystem.readFileSync(this.metadata.publicKeyPath);
            const privateKey = this.fileSystem.readFileSync(this.metadata.privateKeyPath);
            // Load private and public keys
            this.loadKeyPair(publicKey, privateKey, passphrase);
        }
        /////////
        // PKI //
        /////////
        // Load pki keys and certs
        if (this.metadata.pkiKeyPath) {
            this.pkiInfo.key = fs_1.default.readFileSync(this.metadata.pkiKeyPath);
        }
        if (this.metadata.pkiCertPath) {
            this.pkiInfo.cert = fs_1.default.readFileSync(this.metadata.pkiCertPath);
        }
        if (this.metadata.caCertPath) {
            this.pkiInfo.caCert = fs_1.default.readFileSync(this.metadata.caCertPath);
        }
        this.loadPKIInfo(this.pkiInfo.key, this.pkiInfo.cert, this.pkiInfo.caCert, true);
    }
    /**
     * Generates a new assymetric key pair (publicKey and privateKey).
     * @param name Name of keypair owner
     * @param email Email of keypair owner
     * @param passphrase Passphrase to lock the keypair
     * @param nbits Size of the new keypair
     * @param replacePrimary If true, the generated keypair becomes the new primary identity of the key manager
     * @param progressCallback A progress hook for keypair generation
     */
    async generateKeyPair(name, email, passphrase, nbits = 4096, replacePrimary = false, progressCallback) {
        // kbpgp doesn't seem to work for small nbits so set a minimum of 1024
        if (nbits < 1024) {
            throw new Error('nbits must be greater than 1024 for keypair generation');
        }
        // Define options
        const flags = kbpgp_1.default["const"].openpgp;
        const params = {
            asp: (progressCallback) ? new kbpgp_1.default.ASP({ progress_hook: progressCallback }) : undefined,
            userid: `${name} <${email}>`,
            primary: {
                nbits: nbits,
                flags: flags.certify_keys | flags.sign_data | flags.auth | flags.encrypt_comm | flags.encrypt_storage,
                expire_in: 0 // never expire
            },
            subkeys: []
        };
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.generate)(params);
        await util_1.promisify(identity.sign.bind(identity))({});
        // Export pub key first
        const publicKey = await util_1.promisify(identity.export_pgp_public.bind(identity))({});
        // Finally export priv key
        const privateKey = await util_1.promisify(identity.export_pgp_private.bind(identity))({ passphrase: passphrase });
        // Resolve to parent promise
        const keypair = { private: privateKey, public: publicKey };
        if (replacePrimary) {
            // Set the new keypair
            this.primaryKeyPair = keypair;
            // Set the new identity
            this.primaryIdentity = identity;
        }
        return keypair;
    }
    /**
     * Get the primary keypair
     */
    getKeyPair() {
        return this.primaryKeyPair;
    }
    /**
     * Determines whether public key is loaded or not
     */
    hasPublicKey() {
        return (this.primaryKeyPair.public) ? true : false;
    }
    /**
     * Get the public key of the primary keypair
     */
    getPublicKey() {
        if (!this.primaryKeyPair.public) {
            throw new Error('Public key does not exist in memory');
        }
        return this.primaryKeyPair.public;
    }
    /**
     * Get the private key of the primary keypair
     */
    getPrivateKey() {
        if (!this.primaryKeyPair.private) {
            throw new Error('Private key does not exist in memory');
        }
        return this.primaryKeyPair.private;
    }
    /**
     * Loads the keypair into the key manager as the primary identity
     * @param publicKey Public Key
     * @param privateKey Private Key
     * @param passphrase Passphrase to unlock the private key
     */
    async loadKeyPair(publicKey, privateKey, passphrase) {
        await this.loadPrivateKey(privateKey);
        await this.loadPublicKey(publicKey);
        await this.loadIdentity(passphrase);
    }
    /**
     * Loads the private key into the primary keypair
     * @param privateKey Private Key
     */
    async loadPrivateKey(privateKey) {
        let keyBuffer;
        if (typeof privateKey === 'string') {
            keyBuffer = Buffer.from(await this.fileSystem.promises.readFile(privateKey));
            this.metadata.privateKeyPath = privateKey;
            this.writeMetadata();
        }
        else {
            keyBuffer = privateKey;
        }
        this.primaryKeyPair.private = keyBuffer.toString();
    }
    /**
     * Loads the public key into the primary keypair
     * @param publicKey Public Key
     */
    async loadPublicKey(publicKey) {
        let keyBuffer;
        if (typeof publicKey === 'string') {
            keyBuffer = Buffer.from(await this.fileSystem.promises.readFile(publicKey));
            this.metadata.publicKeyPath = publicKey;
            this.writeMetadata();
        }
        else {
            keyBuffer = publicKey;
        }
        this.primaryKeyPair.public = keyBuffer.toString();
    }
    /**
     * Loads the primary identity into the key manager from the existing keypair
     * @param passphrase Passphrase to unlock the private key
     */
    async loadIdentity(passphrase) {
        const publicKey = this.getPublicKey();
        const privateKey = this.getPrivateKey();
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.import_from_armored_pgp)({ armored: publicKey });
        await util_1.promisify(identity.merge_pgp_private.bind(identity))({ armored: privateKey });
        if (identity.is_pgp_locked.bind(identity)()) {
            await util_1.promisify(identity.unlock_pgp.bind(identity))({ passphrase: passphrase });
        }
        this.primaryIdentity = identity;
    }
    /**
     * Export the primary private key to a specified location
     * @param path Destination path
     */
    async exportPrivateKey(path) {
        await this.fileSystem.promises.writeFile(path, this.primaryKeyPair.private);
        this.metadata.privateKeyPath = path;
        this.writeMetadata();
    }
    /**
     * Export the primary public key to a specified location
     * @param path Destination path
     */
    async exportPublicKey(path) {
        await this.fileSystem.promises.writeFile(path, this.primaryKeyPair.public);
        this.metadata.publicKeyPath = path;
        this.writeMetadata();
    }
    /**
     * Synchronously generates a new symmetric key and stores it in the key manager
     * @param name Unique name of the generated key
     * @param passphrase Passphrase to derive the key from
     */
    generateKeySync(name, passphrase) {
        const salt = crypto_1.default.randomBytes(32);
        this.derivedKeys[name] = crypto_1.default.pbkdf2Sync(passphrase, salt, 10000, 256 / 8, 'sha256');
        return this.derivedKeys[name];
    }
    /**
     * Asynchronously Generates a new symmetric key and stores it in the key manager
     * @param name Unique name of the generated key
     * @param passphrase Passphrase to derive the key from
     */
    async generateKey(name, passphrase) {
        const salt = crypto_1.default.randomBytes(32);
        this.derivedKeys[name] = await util_1.promisify(crypto_1.default.pbkdf2)(passphrase, salt, 10000, 256 / 8, 'sha256');
        return this.derivedKeys[name];
    }
    /**
     * Synchronously imports an existing key from file or Buffer
     * @param name Unique name of the imported key
     * @param key Key to be imported
     */
    importKeySync(name, key) {
        if (typeof key === 'string') {
            this.derivedKeys[name] = this.fileSystem.readFileSync(key);
        }
        else {
            this.derivedKeys[name] = key;
        }
    }
    /**
     * Asynchronously imports an existing key from file or Buffer
     * @param name Unique name of the imported key
     * @param key Key to be imported
     */
    async importKey(name, key) {
        if (typeof key === 'string') {
            this.derivedKeys[name] = await this.fileSystem.promises.readFile(key);
        }
        else {
            this.derivedKeys[name] = key;
        }
    }
    /**
     * Synchronously exports an existing key from file or Buffer
     * @param name Name of the key to be exported
     * @param path Destination path
     * @param createPath If set to true, the path is recursively created
     */
    exportKeySync(name, path, createPath) {
        if (!this.derivedKeys.has(name)) {
            throw Error(`There is no key loaded for name: ${name}`);
        }
        if (createPath) {
            this.fileSystem.mkdirSync(path_1.default.dirname(path), { recursive: true });
        }
        this.fileSystem.writeFileSync(path, this.derivedKeys[name]);
    }
    /**
     * Asynchronously exports an existing key from file or Buffer
     * @param name Name of the key to be exported
     * @param path Destination path
     * @param createPath If set to true, the path is recursively created
     */
    async exportKey(name, path, createPath) {
        if (!this.derivedKeys.has(name)) {
            throw Error(`There is no key loaded for name: ${name}`);
        }
        if (createPath) {
            await this.fileSystem.promises.mkdir(path_1.default.dirname(path), { recursive: true });
        }
        await this.fileSystem.promises.writeFile(path, this.derivedKeys[name]);
    }
    /**
     * Loads an identity from the given public key
     * @param publicKey Buffer containing the public key
     */
    async getIdentityFromPublicKey(publicKey) {
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.import_from_armored_pgp)({ armored: publicKey });
        return identity;
    }
    /**
     * Loads an identity from the given private key
     * @param publicKey Buffer containing the public key
     */
    async getIdentityFromPrivateKey(privateKey, passphrase) {
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.import_from_armored_pgp)({ armored: privateKey });
        if (identity.is_pgp_locked()) {
            await util_1.promisify(identity.unlock_pgp)({ passphrase: passphrase });
        }
        return identity;
    }
    /**
     * Signs the given data with the provided key or the primary key if none is specified
     * @param data Buffer or file containing the data to be signed
     * @param privateKey Buffer containing the key to sign with. Defaults to primary private key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    async signData(data, privateKey, keyPassphrase) {
        let resolvedIdentity;
        if (privateKey) {
            if (!keyPassphrase) {
                throw new Error('passphrase for private key was not provided');
            }
            resolvedIdentity = await this.getIdentityFromPrivateKey(privateKey, keyPassphrase);
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw new Error('no identity available for signing');
        }
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.signData(data, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            const params = {
                msg: data.toString(),
                sign_with: resolvedIdentity
            };
            const result_string = await util_1.promisify(kbpgp_1.default.box)(params);
            return Buffer.from(result_string);
        }
    }
    /**
     * Signs the given file with the provided key or the primary key if none is specified
     * @param filePath Path to file containing the data to be signed
     * @param privateKey The key to sign with. Defaults to primary public key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    async signFile(filePath, privateKey, keyPassphrase) {
        // Get key if provided
        let keyBuffer;
        if (privateKey) {
            if (typeof privateKey === 'string') { // Path
                // Read in from fs
                keyBuffer = Buffer.from(this.fileSystem.readFileSync(privateKey));
            }
            else { // Buffer
                keyBuffer = privateKey;
            }
        }
        // Read file into buffer
        const buffer = Buffer.from(this.fileSystem.readFileSync(filePath));
        // Sign the buffer
        const signedBuffer = await this.signData(buffer, keyBuffer, keyPassphrase);
        // Write buffer to signed file
        const signedPath = `${filePath}.sig`;
        this.fileSystem.writeFileSync(signedPath, signedBuffer);
        return signedPath;
    }
    /**
     * Verifies the given data with the provided key or the primary key if none is specified
     * @param data Buffer or file containing the data to be verified
     * @param signature The PGP signature
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    async verifyData(data, signature, publicKey) {
        const ring = new kbpgp_1.default.keyring.KeyRing;
        let resolvedIdentity;
        if (publicKey) {
            resolvedIdentity = await this.getIdentityFromPublicKey(publicKey);
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw new Error('no identity available for verifying');
        }
        ring.add_key_manager(resolvedIdentity);
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.verifyData(data, signature, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            const params = {
                armored: signature,
                data: data,
                keyfetch: ring
            };
            const literals = await util_1.promisify(kbpgp_1.default.unbox)(params);
            // Get the identity that signed the data if any
            let dataSigner = literals[0].get_data_signer();
            // Retrieve the key manager associated with that data signer
            let keyManager;
            if (dataSigner) {
                keyManager = dataSigner.get_key_manager();
            }
            // If we know the pgp finger print then we say the data is verified.
            // Otherwise it is unverified.
            if (keyManager) {
                if (keyManager.get_pgp_fingerprint()) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
    }
    /**
     * Verifies the given file with the provided key or the primary key if none is specified
     * @param filePath Path to file containing the data to be verified
     * @param signaturePath The path to the file containing the PGP signature
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    async verifyFile(filePath, signaturePath, publicKey) {
        // Get key if provided
        let keyBuffer;
        if (publicKey) {
            if (typeof publicKey === 'string') { // Path
                // Read in from fs
                keyBuffer = this.fileSystem.readFileSync(publicKey);
            }
            else { // Buffer
                keyBuffer = publicKey;
            }
        }
        // Read in file buffer and signature
        const fileBuffer = this.fileSystem.readFileSync(filePath);
        const signatureBuffer = this.fileSystem.readFileSync(signaturePath);
        const isVerified = await this.verifyData(fileBuffer, signatureBuffer, keyBuffer);
        return isVerified;
    }
    /**
     * Encrypts the given data for a specific public key
     * @param data The data to be encrypted
     * @param publicKey The key to encrypt for
     */
    async encryptData(data, publicKey) {
        let resolvedIdentity;
        if (publicKey) {
            resolvedIdentity = await this.getIdentityFromPublicKey(publicKey);
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw new Error(`Identity could not be resolved for encrypting`);
        }
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.encryptData(data, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            const params = {
                msg: data,
                encrypt_for: resolvedIdentity
            };
            const result_string = await util_1.promisify(kbpgp_1.default.box)(params);
            return result_string;
        }
    }
    /**
     * Decrypts the given data with the provided key or the primary key if none is given
     * @param data The data to be decrypted
     * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    async decryptData(data, privateKey, keyPassphrase) {
        var ring = new kbpgp_1.default.keyring.KeyRing;
        let resolvedIdentity;
        if (privateKey) {
            if (keyPassphrase) {
                resolvedIdentity = await this.getIdentityFromPrivateKey(privateKey, keyPassphrase);
            }
            else {
                throw new Error('A key passphrase must be supplied if a privateKey is specified');
            }
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw (Error('no identity available for signing'));
        }
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.decryptData(data, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            ring.add_key_manager(resolvedIdentity);
            const params = {
                armored: data.toString(),
                keyfetch: ring
            };
            const literals = await util_1.promisify(kbpgp_1.default.unbox)(params);
            const decryptedData = Buffer.from(literals[0].toString());
            return decryptedData;
        }
    }
    /////////
    // PKI //
    /////////
    get PKIInfo() {
        return this.pkiInfo;
    }
    loadPKIInfo(key, cert, caCert, writeToFile = false) {
        if (key) {
            this.pkiInfo.key = key;
        }
        if (cert) {
            this.pkiInfo.cert = cert;
        }
        if (caCert) {
            this.pkiInfo.caCert = caCert;
        }
        if (writeToFile) {
            // Store in the metadata path folder
            const storagePath = path_1.default.dirname(this.metadataPath);
            if (key) {
                this.metadata.pkiKeyPath = path_1.default.join(storagePath, 'pki_private_key');
                fs_1.default.writeFileSync(this.metadata.pkiKeyPath, key);
            }
            if (cert) {
                this.metadata.pkiCertPath = path_1.default.join(storagePath, 'pki_cert');
                fs_1.default.writeFileSync(this.metadata.pkiCertPath, cert);
            }
            if (caCert) {
                this.metadata.caCertPath = path_1.default.join(storagePath, 'ca_cert');
                fs_1.default.writeFileSync(this.metadata.caCertPath, caCert);
            }
        }
    }
    /* ============ HELPERS =============== */
    /**
     * Get the key for a given name
     * @param name The unique name of the desired key
     */
    getKey(name) {
        return this.derivedKeys[name];
    }
    /**
     * Determines if the Key Manager has a certain key
     * @param name The unique name of the desired key
     */
    hasKey(name) {
        if (this.derivedKeys[name]) {
            return true;
        }
        return false;
    }
    writeMetadata() {
        const metadata = JSON.stringify(this.metadata);
        this.fileSystem.writeFileSync(this.metadataPath, metadata);
    }
    loadMetadata() {
        // Check if file exists
        if (this.fileSystem.existsSync(this.metadataPath)) {
            const metadata = this.fileSystem.readFileSync(this.metadataPath).toString();
            this.metadata = JSON.parse(metadata);
        }
    }
}
exports.default = KeyManager;
//# sourceMappingURL=KeyManager.js.map