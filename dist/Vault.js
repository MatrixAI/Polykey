"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const futoin_hkdf_1 = __importDefault(require("futoin-hkdf"));
const encryptedfs_1 = require("encryptedfs");
const vfs = require('virtualfs');
class Vault {
    constructor(name, symKey, baseDir) {
        // how do we create pub/priv key pair?
        // do we use the same gpg pub/priv keypair
        this.keyLen = 32;
        this.key = this.genSymKey(symKey, this.keyLen);
        // Set filesystem
        const vfsInstance = new vfs.VirtualFS;
        this.fs = new encryptedfs_1.EncryptedFS(symKey, vfsInstance, vfsInstance, fs_1.default, process);
        this.name = name;
        this.vaultPath = path_1.default.join(baseDir, name);
        // make the vault directory
        this.fs.mkdirSync(this.vaultPath, { recursive: true });
        this.secrets = new Map();
        this.loadSecrets();
    }
    loadSecrets() {
        const secrets = fs_1.default.readdirSync(this.vaultPath, undefined);
        for (const secret of secrets) {
            this.secrets.set(secret, null);
        }
    }
    genSymKey(asymKey, keyLen) {
        return Buffer.from(futoin_hkdf_1.default(asymKey.toString(), keyLen));
    }
    secretExists(secretName) {
        const secretPath = path_1.default.join(this.vaultPath, secretName);
        return this.secrets.has(secretName) && this.fs.existsSync(secretPath);
    }
    addSecret(secretName, secretBuf) {
        // TODO: check if secret already exists
        const writePath = path_1.default.join(this.vaultPath, secretName);
        // TODO: use aysnc methods
        const fd = this.fs.openSync(writePath, 'w');
        this.fs.writeSync(fd, secretBuf, 0, secretBuf.length, 0);
        this.secrets.set(secretName, secretBuf);
        // TODO: close file or use write file sync
    }
    getSecret(secretName) {
        if (this.secrets.has(secretName)) {
            const secret = this.secrets.get(secretName);
            if (secret) {
                return secret;
            }
            else {
                const secretPath = path_1.default.join(this.vaultPath, secretName);
                // TODO: this should be async
                const secretBuf = this.fs.readFileSync(secretPath, {});
                this.secrets.set(secretName, secretBuf);
                return secretBuf;
            }
        }
        throw Error('Secret: ' + secretName + ' does not exist');
    }
    removeSecret(secretName) {
        if (this.secrets.has(secretName)) {
            const successful = this.secrets.delete(secretName);
            if (successful) {
                return;
            }
            throw Error('Secret: ' + secretName + ' was not removed');
        }
        throw Error('Secret: ' + secretName + ' does not exist');
    }
    listSecrets() {
        let secrets = Array.from(this.secrets.keys());
        return secrets;
    }
    tagVault() {
    }
    untagVault() {
    }
    shareVault() {
    }
    unshareVault() {
    }
}
exports.default = Vault;
//# sourceMappingURL=Vault.js.map