"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const GitServer_1 = __importDefault(require("./git/GitServer"));
const KeyManager_1 = __importDefault(require("./keys/KeyManager"));
const PeerManager_1 = __importDefault(require("./peers/PeerManager"));
const VaultManager_1 = __importDefault(require("./vaults/VaultManager"));
class Polykey {
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager, vaultManager, peerManager) {
        this.polykeyPath = polykeyPath;
        // Set key manager
        this.keyManager = keyManager !== null && keyManager !== void 0 ? keyManager : new KeyManager_1.default(this.polykeyPath, fileSystem);
        // Set or Initialize vaultManager
        this.vaultManager = vaultManager !== null && vaultManager !== void 0 ? vaultManager : new VaultManager_1.default(this.polykeyPath, fileSystem, this.keyManager);
        // Initialize peer store and peer discovery classes
        this.peerManager = peerManager !== null && peerManager !== void 0 ? peerManager : new PeerManager_1.default(this.polykeyPath, fileSystem, this.keyManager);
        // Start git server
        this.gitServer = new GitServer_1.default(this.polykeyPath, this.vaultManager);
        this.peerManager.connectLocalPeerInfo(this.gitServer.address);
    }
}
exports.default = Polykey;
//# sourceMappingURL=Polykey.js.map