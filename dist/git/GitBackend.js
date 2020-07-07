"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const readable_stream_1 = require("readable-stream");
const uploadPack_1 = __importDefault(require("./upload-pack/uploadPack"));
const GitSideBand_1 = __importDefault(require("./side-band/GitSideBand"));
const packObjects_1 = __importDefault(require("./pack-objects/packObjects"));
// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation
// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server
// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them
class GitBackend {
    constructor(polykeyPath, vaultManager) {
        this.polykeyPath = polykeyPath;
        this.vaultManager = vaultManager;
    }
    /**
     * Find out whether vault exists.
     * @param vaultName Name of vault to check
     * @param publicKey Public key of peer trying to access vault
     */
    exists(vaultName, publicKey) {
        const vault = this.vaultManager.getVault(vaultName);
        if (vault) {
            return vault.peerCanAccess(publicKey);
        }
        return false;
    }
    async handleInfoRequest(vaultName) {
        var _a;
        // Only handle upload-pack for now
        const service = 'upload-pack';
        const connectingPublicKey = '';
        const responseBuffers = [];
        if (!this.exists(vaultName, connectingPublicKey)) {
            throw new Error('Vault does not exist');
        }
        else {
            responseBuffers.push(Buffer.from(this.createGitPacketLine('# service=git-' + service + '\n')));
            responseBuffers.push(Buffer.from('0000'));
            const fileSystem = (_a = this.vaultManager.getVault(vaultName)) === null || _a === void 0 ? void 0 : _a.EncryptedFS;
            const buffers = await uploadPack_1.default(fileSystem, path_1.default.join(this.polykeyPath, vaultName), undefined, true);
            const buffersToWrite = buffers !== null && buffers !== void 0 ? buffers : [];
            responseBuffers.push(...buffersToWrite);
        }
        return Buffer.concat(responseBuffers);
    }
    async handlePackRequest(vaultName, body) {
        return new Promise(async (resolve, reject) => {
            var _a;
            const responseBuffers = [];
            // Check if vault exists
            const connectingPublicKey = '';
            if (!this.exists(vaultName, connectingPublicKey)) {
                throw new Error('Vault does not exist');
            }
            const fileSystem = (_a = this.vaultManager.getVault(vaultName)) === null || _a === void 0 ? void 0 : _a.EncryptedFS;
            if (fileSystem) {
                if (body.toString().slice(4, 8) == 'want') {
                    const wantedObjectId = body.toString().slice(9, 49);
                    const packResult = await packObjects_1.default(fileSystem, path_1.default.join(this.polykeyPath, vaultName), [wantedObjectId], undefined);
                    // This the 'wait for more data' line as I understand it
                    responseBuffers.push(Buffer.from('0008NAK\n'));
                    // This is to get the side band stuff working
                    const readable = new readable_stream_1.PassThrough();
                    const progressStream = new readable_stream_1.PassThrough();
                    const sideBand = GitSideBand_1.default.mux('side-band-64', readable, packResult.packstream, progressStream, []);
                    sideBand.on('data', (data) => {
                        responseBuffers.push(data);
                    });
                    sideBand.on('end', () => {
                        resolve(Buffer.concat(responseBuffers));
                    });
                    sideBand.on('error', (err) => {
                        reject(err);
                    });
                    // Write progress to the client
                    progressStream.write(Buffer.from('0014progress is at 50%\n'));
                    progressStream.end();
                }
            }
        });
    }
    // ============ Helper functions ============ //
    createGitPacketLine(line) {
        const hexPrefix = (4 + line.length).toString(16);
        return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line;
    }
}
exports.default = GitBackend;
//# sourceMappingURL=GitBackend.js.map