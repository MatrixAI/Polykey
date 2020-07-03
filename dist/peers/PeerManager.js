"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const grpc_1 = __importDefault(require("grpc"));
const GitClient_1 = __importDefault(require("../git/GitClient"));
const GitBackend_1 = __importDefault(require("../git/GitBackend"));
const RPCMessage_1 = __importDefault(require("../rpc/RPCMessage"));
const utils_1 = require("../utils");
const PeerInfo_1 = __importStar(require("../peers/PeerInfo"));
const MulticastBroadcaster_1 = __importDefault(require("../peers/MulticastBroadcaster"));
const keybaseDiscovery = {
    name: 'Keybase',
    findUser: async (handle, service) => {
        const url = `https://keybase.io/_/api/1.0/user/lookup.json?${service}=${handle}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const pubKey = data.them[0].public_keys.primary.bundle;
            return pubKey;
        }
        catch (err) {
            throw new Error(`User was not found: ${err.message}`);
        }
    }
};
class PeerManager {
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager, vaultManager, peerInfo, socialDiscoveryServices = [], customPort) {
        this.metadata = { localPeerInfo: null };
        this.fileSystem = fileSystem;
        this.fileSystem.mkdirSync(polykeyPath, { recursive: true });
        this.metadataPath = path_1.default.join(polykeyPath, '.peerMetadata');
        // Set given variables
        this.keyManager = keyManager;
        this.socialDiscoveryServices = socialDiscoveryServices;
        // Load metadata with peer info
        this.loadMetadata();
        // Load peer store and local peer info
        if (peerInfo) {
            this.localPeerInfo = peerInfo;
            this.writeMetadata();
        }
        else if (this.metadata.localPeerInfo) {
            this.localPeerInfo = this.metadata.localPeerInfo;
        }
        else if (this.keyManager.hasPublicKey()) {
            this.localPeerInfo = new PeerInfo_1.default(this.keyManager.getPublicKey());
        }
        this.peerStore = new Map();
        this.socialDiscoveryServices = [];
        this.socialDiscoveryServices.push(keybaseDiscovery);
        for (const service of socialDiscoveryServices) {
            this.socialDiscoveryServices.push(service);
        }
        this.multicastBroadcaster = new MulticastBroadcaster_1.default(this.addPeer, this.localPeerInfo, this.keyManager);
        this.peerConnections = new Map();
        /////////////////
        // GRPC Server //
        /////////////////
        this.gitBackend = new GitBackend_1.default(polykeyPath, vaultManager);
        this.server = new grpc_1.default.Server();
        const protoLoader = require('@grpc/proto-loader');
        const PROTO_PATH = __dirname + '/../../proto/git_server.proto';
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        const git_server_proto = grpc_1.default.loadPackageDefinition(packageDefinition);
        // Add service
        async function requestInfo(call, callback) {
            const vaultName = call.request.vaultName;
            const body = await this.gitBackend.handleInfoRequest(vaultName);
            callback(null, { vaultName: vaultName, body: body });
        }
        async function requestPack(call, callback) {
            const vaultName = call.request.vaultName;
            const body = call.request.body.toString();
            callback(null, { vaultName: vaultName, body: await this.gitBackend.handlePackRequest(vaultName, body) });
        }
        this.server.addService(git_server_proto.GitServer.service, {
            requestInfo: requestInfo.bind(this),
            requestPack: requestPack.bind(this)
        });
        // Create the server credentials. SSL only if ca cert exists
        const pkiInfo = this.keyManager.PKIInfo;
        if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
            this.credentials = grpc_1.default.ServerCredentials.createSsl(pkiInfo.caCert, [{
                    private_key: pkiInfo.key,
                    cert_chain: pkiInfo.cert,
                }], true);
        }
        else {
            this.credentials = grpc_1.default.ServerCredentials.createInsecure();
        }
        // Bind server and set address
        const port = this.server.bind('0.0.0.0:0', this.credentials);
        const address = new PeerInfo_1.Address('localhost', port.toString());
        this.server.start();
        this.localPeerInfo.connect(address);
    }
    ////////////////
    // Peer store //
    ////////////////
    /**
     * Get the peer info of the current keynode
     */
    getLocalPeerInfo() {
        return this.localPeerInfo;
    }
    /**
     * Set the address of the active server
     * @param adress Address of active server
     */
    connectLocalPeerInfo(address) {
        this.localPeerInfo.connect(address);
    }
    /**
     * Add a peer's info to the peerStore
     * @param peerInfo Info of the peer to be added
     */
    addPeer(peerInfo) {
        this.peerStore.set(peerInfo.publicKey, peerInfo);
    }
    /**
     * Retrieves a peer for the given public key
     * @param publicKey Public key of the desired peer
     */
    getPeer(publicKey) {
        var _a;
        return (_a = this.peerStore.get(publicKey)) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Determines if the peerStore contains the desired peer
     * @param publicKey Public key of the desired peer
     */
    hasPeer(pubKey) {
        return this.peerStore.has(pubKey);
    }
    //////////////////////
    // Social discovery //
    //////////////////////
    /**
     * Finds an existing peer using multicast peer discovery
     * @param publicKey Public key of the desired peer
     */
    async findPubKey(publicKey) {
        return new Promise((resolve, reject) => {
            this.multicastBroadcaster.requestPeerContact(publicKey);
            this.multicastBroadcaster.on('found', (peerInfo) => {
                if (peerInfo.publicKey == publicKey) {
                    resolve(peerInfo);
                }
            });
            this.multicastBroadcaster.on('timeout', (timedOutPubKey) => {
                if (timedOutPubKey == publicKey) {
                    reject('The broadcaster stopped looking');
                }
            });
        });
    }
    /**
     * Finds an existing peer given a social service and handle
     * @param handle Username or handle of the user (e.g. @john-smith)
     * @param service Service on which to search for the user (e.g. github)
     */
    async findSocialUser(handle, service) {
        const tasks = [];
        for (const socialDiscovery of this.socialDiscoveryServices) {
            try {
                tasks.push(socialDiscovery.findUser(handle, service));
            }
            catch (error) {
                console.log(`Could not find user on this discovery service: ${socialDiscovery.name}`);
            }
        }
        const pubKeyOrFail = await utils_1.firstPromiseFulfilled(tasks);
        if (pubKeyOrFail.length > 1) {
            throw new Error('Could not find public key from services');
        }
        const pubKeyFound = pubKeyOrFail[0];
        const peerInfo = await this.findPubKey(pubKeyFound);
        return peerInfo;
    }
    ///////////////////////
    // Peers Connections //
    ///////////////////////
    /**
     * Get a secure connection to the peer
     * @param peer Public key of an existing peer or address of new peer
     */
    connectToPeer(peer) {
        var _a;
        // Throw error if trying to connect to self
        if (peer == this.localPeerInfo.connectedAddr || peer == this.localPeerInfo.publicKey) {
            throw new Error('Cannot connect to self');
        }
        let address;
        if (typeof peer == 'string') {
            const existingSocket = this.peerConnections.get(peer);
            if (existingSocket) {
                return existingSocket;
            }
            const peerAddress = (_a = this.getPeer(peer)) === null || _a === void 0 ? void 0 : _a.connectedAddr;
            if (peerAddress) {
                address = peerAddress;
            }
            else {
                throw new Error('Peer does not exist in peer store');
            }
        }
        else {
            address = peer;
        }
        const conn = new GitClient_1.default(address, this.keyManager);
        if (typeof peer == 'string') {
            this.peerConnections.set(peer, conn);
        }
        return conn;
    }
    /* ============ HELPERS =============== */
    writeMetadata() {
        const metadata = JSON.stringify(RPCMessage_1.default.encodePeerInfo(this.localPeerInfo));
        this.fileSystem.writeFileSync(this.metadataPath, metadata);
    }
    loadMetadata() {
        // Check if file exists
        if (this.fileSystem.existsSync(this.metadataPath)) {
            const metadata = this.fileSystem.readFileSync(this.metadataPath).toString();
            this.localPeerInfo = RPCMessage_1.default.decodePeerInfo(Buffer.from(metadata));
        }
    }
}
exports.default = PeerManager;
//# sourceMappingURL=PeerManager.js.map