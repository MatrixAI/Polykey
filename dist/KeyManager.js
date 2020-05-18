"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const util_1 = require("util");
// js imports
const kbpgp = require('kbpgp');
var F = kbpgp["const"].openpgp;
const zxcvbn = require('zxcvbn');
class KeyManager {
    constructor(polyKeyPath = '~/.polykey/') {
        this.keyPair = { private: '', public: '', passphrase: '' };
        this.identity = undefined;
        this.storePath = polyKeyPath;
        this.derivedKeys = new Map();
    }
    // return {private: string, public: string}
    async generateKeyPair(name, email, passphrase, numBits = 4096) {
        // Validate passphrase
        const passValidation = zxcvbn(passphrase);
        // The following is an arbitrary delineation of desirable scores
        if (passValidation.score < 2) {
            throw new Error(`passphrase score for new keypair is below 2!`);
        }
        // Define options
        var options = {
            userid: `${name} <${email}>`,
            primary: {
                nbits: 4096,
                flags: F.certify_keys | F.sign_data | F.auth | F.encrypt_comm | F.encrypt_storage,
                expire_in: 0 // never expire
            },
            subkeys: [
            // {
            //   nbits: 2048,
            //   flags: F.sign_data,
            //   expire_in: 86400 * 365 * 8 // 8 years
            // }
            ]
        };
        this.passphrase = passphrase;
        return new Promise((resolve, reject) => {
            kbpgp.KeyManager.generate(options, (err, identity) => {
                identity.sign({}, (err) => {
                    if (err) {
                        reject(err);
                    }
                    // Export pub key first
                    identity.export_pgp_public({}, (err, pubKey) => {
                        if (err) {
                            reject(err);
                        }
                        // Finally export priv key
                        identity.export_pgp_private({ passphrase: passphrase }, (err, privKey) => {
                            if (err) {
                                reject(err);
                            }
                            // Resolve to parent promise
                            const keypair = { private: privKey, public: pubKey, passphrase: passphrase };
                            this.keyPair = keypair;
                            // Set the new identity
                            this.identity = identity;
                            resolve(keypair);
                        });
                    });
                });
            });
        });
    }
    getKeyPair() {
        return this.keyPair;
    }
    getPublicKey() {
        return this.keyPair.public;
    }
    getPrivateKey() {
        return this.keyPair.private;
    }
    async loadPrivateKey(privateKey, passphrase = '') {
        try {
            let keyBuffer;
            if (typeof privateKey === 'string') {
                keyBuffer = Buffer.from(await fs_1.default.promises.readFile(privateKey));
            }
            else {
                keyBuffer = privateKey;
            }
            this.keyPair.private = keyBuffer.toString();
            if (passphrase) {
                this.passphrase = passphrase;
            }
        }
        catch (err) {
            throw (err);
        }
    }
    async loadPublicKey(publicKey) {
        try {
            let keyBuffer;
            if (typeof publicKey === 'string') {
                keyBuffer = Buffer.from(await fs_1.default.promises.readFile(publicKey));
            }
            else {
                keyBuffer = publicKey;
            }
            this.keyPair.public = keyBuffer.toString();
        }
        catch (err) {
            throw (err);
        }
    }
    async loadIdentity(passphrase) {
        return new Promise((resolve, reject) => {
            const pubKey = this.getPublicKey();
            const privKey = this.getPrivateKey();
            kbpgp.KeyManager.import_from_armored_pgp({ armored: pubKey }, (err, identity) => {
                if (err) {
                    reject(err);
                }
                identity.merge_pgp_private({
                    armored: privKey
                }, (err) => {
                    if (err) {
                        reject(err);
                    }
                    if (identity.is_pgp_locked()) {
                        identity.unlock_pgp({
                            passphrase: passphrase
                        }, (err) => {
                            if (err) {
                                reject(err);
                            }
                            this.identity = identity;
                            resolve();
                        });
                    }
                    else {
                        this.identity = identity;
                        resolve();
                    }
                });
            });
        });
    }
    async loadKeyPair(publicKey, privateKey, passphrase = '') {
        await this.loadPrivateKey(privateKey);
        await this.loadPublicKey(publicKey);
        await this.loadIdentity(passphrase);
        if (passphrase) {
            this.passphrase;
        }
    }
    async exportPrivateKey(path) {
        await fs_1.default.promises.writeFile(path, this.keyPair.private);
    }
    async exportPublicKey(path) {
        await fs_1.default.promises.writeFile(path, this.keyPair.public);
    }
    // symmetric key generation
    generateKeySync(name, passphrase) {
        const salt = crypto_1.default.randomBytes(32);
        this.derivedKeys[name] = crypto_1.default.pbkdf2Sync(passphrase, salt, 10000, 256 / 8, 'sha256');
        return this.derivedKeys[name];
    }
    async generateKey(name, passphrase) {
        const salt = crypto_1.default.randomBytes(32);
        this.derivedKeys[name] = await util_1.promisify(crypto_1.default.pbkdf2)(passphrase, salt, 10000, 256 / 8, 'sha256');
        return this.derivedKeys[name];
    }
    importKeySync(name, keyPath) {
        this.derivedKeys[name] = fs_1.default.readFileSync(keyPath);
    }
    async importKey(name, keyPath) {
        this.derivedKeys[name] = await fs_1.default.promises.readFile(keyPath);
    }
    importKeyBuffer(name, key) {
        this.derivedKeys[name] = key;
    }
    async exportKey(name, path, createPath) {
        if (!this.derivedKeys[name]) {
            throw Error(`There is no key loaded for name: ${name}`);
        }
        if (createPath) {
            await fs_1.default.promises.mkdir(path_1.default.dirname(path), { recursive: true });
        }
        await fs_1.default.promises.writeFile(path, this.derivedKeys[name]);
    }
    exportKeySync(path, createPath) {
        if (!this.derivedKeys[name]) {
            throw Error(`There is no key loaded for name: ${name}`);
        }
        if (createPath) {
            fs_1.default.mkdirSync(path_1.default.dirname(path), { recursive: true });
        }
        fs_1.default.writeFileSync(path, this.derivedKeys[name]);
    }
    async getIdentityFromPublicKey(pubKey) {
        return new Promise((resolve, reject) => {
            kbpgp.KeyManager.import_from_armored_pgp({ armored: pubKey }, (err, identity) => {
                if (err) {
                    reject(err);
                }
                resolve(identity);
            });
        });
    }
    async getIdentityFromPrivateKey(privKey, passphrase) {
        return new Promise((resolve, reject) => {
            kbpgp.KeyManager.import_from_armored_pgp({ armored: privKey }, (err, identity) => {
                if (err) {
                    reject(err);
                }
                if (identity.is_pgp_locked()) {
                    identity.unlock_pgp({
                        passphrase: passphrase
                    }, (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(identity);
                    });
                }
                else {
                    resolve(identity);
                }
            });
        });
    }
    // Sign data
    signData(data, withKey = undefined, keyPassphrase = undefined) {
        return new Promise(async (resolve, reject) => {
            let resolvedIdentity;
            if (withKey !== undefined) {
                if (keyPassphrase === undefined) {
                    reject(Error('passphrase for private key was not provided'));
                }
                resolvedIdentity = await this.getIdentityFromPrivateKey(withKey, keyPassphrase);
            }
            else if (this.identity !== undefined) {
                resolvedIdentity = this.identity;
            }
            else {
                throw (Error('no identity available for signing'));
            }
            const params = {
                msg: data,
                sign_with: resolvedIdentity
            };
            kbpgp.box(params, (err, result_string, result_buffer) => {
                if (err) {
                    reject(err);
                }
                resolve(Buffer.from(result_string));
            });
        });
    }
    // Verify data
    verifyData(data, signature, withKey = undefined) {
        return new Promise(async (resolve, reject) => {
            var ring = new kbpgp.keyring.KeyRing;
            let resolvedIdentity;
            if (withKey !== undefined) {
                resolvedIdentity = await this.getIdentityFromPublicKey(withKey);
            }
            else if (this.identity !== undefined) {
                resolvedIdentity = this.identity;
            }
            else {
                throw (Error('no identity available for signing'));
            }
            ring.add_key_manager(this.identity);
            const params = {
                armored: signature,
                data: data,
                keyfetch: ring
            };
            kbpgp.unbox(params, (err, literals) => {
                if (err) {
                    reject(err);
                }
                let ds = literals[0].get_data_signer();
                let km;
                if (ds) {
                    km = ds.get_key_manager();
                }
                if (km) {
                    resolve(km.get_pgp_fingerprint().toString('hex'));
                }
                else {
                    reject(Error('could not verify file'));
                }
            });
        });
    }
    getKey(name) {
        return this.derivedKeys[name];
    }
    isLoaded() {
        if (this.derivedKeys[name]) {
            return true;
        }
        return false;
    }
}
exports.KeyManager = KeyManager;
//# sourceMappingURL=KeyManager.js.map