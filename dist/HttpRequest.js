"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
class HttpRequest {
    constructor(address, getSocket) {
        this.address = address;
        this.getSocket = getSocket;
    }
    /**
     * The custom http request method to feed into isomorphic-git's [custom http object](https://isomorphic-git.org/docs/en/http)
     */
    request({ url, method, headers, body, onProgress }) {
        return new Promise((resolve, reject) => {
            const { pathname, search } = new URL(url);
            const options = {
                path: pathname + search,
                headers: headers,
                method: method,
                createConnection: () => {
                    return this.getSocket(this.address);
                }
            };
            const req = http_1.default.request(options, (res) => {
                const iter = this.httpMessageToIter(res);
                resolve({
                    url: res.url,
                    method: res.method,
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    body: iter,
                    headers: res.headers
                });
            });
            if (body) {
                for (const buffer of body) {
                    req.write(buffer);
                }
            }
            req.end();
        });
    }
    /**
     * Converts http incoming message into a iterator that can be used by [isomorphic-git](https://isomorphic-git.org)
     * @param message Http IncomingMessage
     */
    httpMessageToIter(message) {
        let ended = false;
        const queue = [];
        let defer = {};
        message.on('data', (chunk) => {
            queue.push(chunk);
            if (defer.resolve) {
                defer.resolve({ value: queue.shift(), done: false });
                defer = {};
            }
        });
        message.on('error', err => {
            if (defer.reject) {
                defer.reject(err);
                defer = {};
            }
        });
        message.on('end', () => {
            ended = true;
            if (defer.resolve) {
                defer.resolve({ done: true });
                defer = {};
            }
        });
        return {
            next() {
                return new Promise((resolve, reject) => {
                    if (queue.length === 0 && ended) {
                        return resolve({ done: true });
                    }
                    else if (queue.length > 0) {
                        return resolve({ value: queue.shift(), done: false });
                    }
                    else if (queue.length === 0 && !ended) {
                        defer = { resolve, reject };
                    }
                });
            },
        };
    }
}
exports.default = HttpRequest;
//# sourceMappingURL=HttpRequest.js.map