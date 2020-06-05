"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kbpgp_1 = __importDefault(require("kbpgp"));
const util_1 = require("util");
const worker_1 = require("threads/worker");
const keyManagerWorker = {
    /**
     * Signs the given data with the provided identity
     * @param data Buffer or file containing the data to be signed
     * @param identity Identity with which to sign with.
     */
    async signData(data, identity) {
        const params = {
            msg: data,
            sign_with: identity
        };
        const result_string = await util_1.promisify(kbpgp_1.default)(params);
        return Buffer.from(result_string);
    },
    /**
     * Verifies the given data with the provided identity
     * @param data Buffer or file containing the data to be verified
     * @param signature The PGP signature
     * @param identity Identity with which to verify with.
     */
    async verifyData(data, signature, identity) {
        const ring = new kbpgp_1.default.keyring.KeyRing;
        ring.add_key_manager(identity);
        const params = {
            armored: signature,
            data: data,
            keyfetch: ring
        };
        const literals = await util_1.promisify(kbpgp_1.default.unbox)(params);
        // Get the identity that signed the data if any
        const dataSigner = literals[0].get_data_signer();
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
    },
    /**
     * Encrypts the given data for the provided identity
     * @param data The data to be encrypted
     * @param identity Identity to encrypt for
     */
    async encryptData(data, identity) {
        const params = {
            msg: data,
            encrypt_for: identity
        };
        const result_string = await util_1.promisify(kbpgp_1.default.box)(params);
        return result_string;
    },
    /**
     * Decrypts the given data with the provided identity
     * @param data The data to be decrypted
     * @param identity Identity to decrypt with
     */
    async decryptData(data, identity) {
        var ring = new kbpgp_1.default.keyring.KeyRing;
        ring.add_key_manager(identity);
        const params = {
            armored: data.toString(),
            keyfetch: ring
        };
        const literals = await util_1.promisify(kbpgp_1.default.unbox)(params);
        const decryptedData = Buffer.from(literals[0].toString());
        return decryptedData;
    }
};
worker_1.expose(keyManagerWorker);
//# sourceMappingURL=KeyManagerWorker.js.map