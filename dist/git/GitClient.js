"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc_1 = __importDefault(require("grpc"));
/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitClient {
    constructor(address, keyManager) {
        const PROTO_PATH = __dirname + '/../../proto/git_server.proto';
        const protoLoader = require('@grpc/proto-loader');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        const git_server_proto = grpc_1.default.loadPackageDefinition(packageDefinition);
        const pkiInfo = keyManager.PKIInfo;
        if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
            this.credentials = grpc_1.default.credentials.createSsl(pkiInfo.caCert, pkiInfo.key, pkiInfo.cert);
        }
        else {
            this.credentials = grpc_1.default.credentials.createInsecure();
        }
        this.client = new git_server_proto.GitServer(address.toString(), this.credentials);
    }
    // checkServerIdentity(hostname: string, cert: grpc.Certificate): Error | undefined {
    //   console.log(hostname);
    //   console.log(cert);
    //   return
    // }
    /**
     * The custom http request method to feed into isomorphic-git's [custom http object](https://isomorphic-git.org/docs/en/http)
     */
    async request({ url, method, headers, body, onProgress }) {
        return new Promise(async (resolve, reject) => {
            const u = new URL(url);
            // Parse request
            if (method == 'GET') {
                // Info request
                const match = u.pathname.match(/\/(.+)\/info\/refs$/);
                if (!match || /\.\./.test(match[1])) {
                    reject(new Error('Error'));
                }
                const vaultName = match[1];
                const infoResponse = await this.requestInfo(vaultName);
                resolve({
                    url: url,
                    method: method,
                    statusCode: 200,
                    statusMessage: 'OK',
                    body: this.iteratorFromData(infoResponse),
                    headers: headers
                });
            }
            else if (method == 'POST') {
                // Info request
                const match = u.pathname.match(/\/(.+)\/git-(.+)/);
                if (!match || /\.\./.test(match[1])) {
                    reject(new Error('Error'));
                }
                const vaultName = match[1];
                const packResponse = await this.requestPack(vaultName, body[0]);
                resolve({
                    url: url,
                    method: method,
                    statusCode: 200,
                    statusMessage: 'OK',
                    body: this.iteratorFromData(packResponse),
                    headers: headers
                });
            }
            else {
                reject(new Error('Method not supported'));
            }
        });
    }
    // ==== HELPER METHODS ==== //
    /**
     * Requests remote info from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     */
    async requestInfo(vaultName) {
        return new Promise((resolve, reject) => {
            this.client.requestInfo({ vaultName: vaultName }, function (err, response) {
                if (err) {
                    console.log('err');
                    console.log(err);
                    reject(err);
                }
                else {
                    resolve(response.body);
                }
            });
        });
    }
    /**
     * Requests a pack from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     */
    async requestPack(vaultName, body) {
        return new Promise((resolve, reject) => {
            this.client.requestPack({ vaultName: vaultName, body: body }, function (err, response) {
                if (err) {
                    console.log('err');
                    console.log(err);
                    reject(err);
                }
                else {
                    resolve(response.body);
                }
            });
        });
    }
    /**
     * Converts a buffer into an iterator expected by isomorphic git.
     * @param data Data to be turned into an iterator
     */
    iteratorFromData(data) {
        let ended = false;
        return {
            next() {
                return new Promise((resolve, reject) => {
                    if (ended) {
                        return resolve({ done: true });
                    }
                    else {
                        ended = true;
                        resolve({ value: data, done: false });
                    }
                });
            },
        };
    }
}
exports.default = GitClient;
//# sourceMappingURL=GitClient.js.map