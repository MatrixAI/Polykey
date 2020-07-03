"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pako_1 = __importDefault(require("pako"));
const path_1 = __importDefault(require("path"));
const log_1 = __importDefault(require("./log"));
const GitTree_1 = __importDefault(require("./GitTree"));
const sha_js_1 = __importDefault(require("sha.js"));
const GitCommit_1 = __importDefault(require("./GitCommit"));
const readable_stream_1 = require("readable-stream");
const GitObjectManager_1 = __importDefault(require("./GitObjectManager"));
const types = {
    commit: 0b0010000,
    tree: 0b0100000,
    blob: 0b0110000,
    tag: 0b1000000,
    ofs_delta: 0b1100000,
    ref_delta: 0b1110000
};
/**
 * Create a packfile stream
 *
 * @link https://isomorphic-git.github.io/docs/packObjects.html
 */
async function packObjects(fileSystem, dir, refs, depth, haves) {
    const gitdir = path_1.default.join(dir, '.git');
    let oids = new Set();
    let shallows = new Set();
    let unshallows = new Set();
    let acks = [];
    haves = (haves) ? haves : [];
    const emitter = undefined;
    const since = undefined;
    for (const ref of refs) {
        try {
            let commits = await log_1.default(fileSystem, dir, gitdir, emitter, ref, depth, since);
            let oldshallows = [];
            for (let i = 0; i < commits.length; i++) {
                let commit = commits[i];
                if (haves.includes(commit.oid)) {
                    acks.push({
                        oid: ref
                    });
                    break;
                }
                oids.add(commit.oid);
                if (i === commits.length - 1) {
                    if (!oldshallows.includes(commit.oid) &&
                        (depth !== undefined || since !== undefined)) {
                        console.log('make it shallow', commit.oid);
                        shallows.add(commit.oid);
                    }
                }
                else if (oldshallows.includes(commit.oid)) {
                    console.log('make it unshallow', commit.oid);
                    unshallows.add(commit.oid);
                }
            }
        }
        catch (err) {
            console.log(err);
            // oh well.
        }
    }
    let objects = await listObjects(fileSystem, dir, gitdir, Array.from(oids));
    let packstream = new readable_stream_1.PassThrough();
    pack(fileSystem, dir, undefined, [...objects], packstream);
    return { packstream, shallows, unshallows, acks };
}
async function listObjects(fileSystem, dir, gitdir = path_1.default.join(dir, '.git'), oids) {
    let commits = new Set();
    let trees = new Set();
    let blobs = new Set();
    // We don't do the purest simplest recursion, because we can
    // avoid reading Blob objects entirely since the Tree objects
    // tell us which oids are Blobs and which are Trees. And we
    // do not need to recurse through commit parents.
    async function walk(oid) {
        let { type, object } = await GitObjectManager_1.default.read(fileSystem, gitdir, oid);
        if (type === 'commit') {
            commits.add(oid);
            let commit = GitCommit_1.default.from(object);
            let tree = commit.headers().tree;
            await walk(tree);
        }
        else if (type === 'tree') {
            trees.add(oid);
            let tree = GitTree_1.default.from(object);
            for (let entry of tree) {
                if (entry.type === 'blob') {
                    blobs.add(entry.oid);
                }
                // only recurse for trees
                if (entry.type === 'tree') {
                    await walk(entry.oid);
                }
            }
        }
    }
    // Let's go walking!
    for (let oid of oids) {
        await walk(oid);
    }
    return [...commits, ...trees, ...blobs];
}
exports.listObjects = listObjects;
async function pack(fileSystem, dir, gitdir = path_1.default.join(dir, '.git'), oids, outputStream) {
    let hash = sha_js_1.default('sha1');
    function write(chunk, enc = undefined) {
        if (enc) {
            outputStream.write(chunk, enc);
        }
        else {
            outputStream.write(chunk);
        }
        hash.update(chunk, enc);
    }
    function writeObject(object, stype) {
        let lastFour;
        let multibyte;
        let length;
        // Object type is encoded in bits 654
        let type = types[stype];
        if (type === undefined)
            throw new Error('Unrecognized type: ' + stype);
        // The length encoding get complicated.
        length = object.length;
        // Whether the next byte is part of the variable-length encoded number
        // is encoded in bit 7
        multibyte = length > 0b1111 ? 0b10000000 : 0b0;
        // Last four bits of length is encoded in bits 3210
        lastFour = length & 0b1111;
        // Discard those bits
        length = length >>> 4;
        // The first byte is then (1-bit multibyte?), (3-bit type), (4-bit least sig 4-bits of length)
        let byte = (multibyte | type | lastFour).toString(16);
        write(byte, 'hex');
        // Now we keep chopping away at length 7-bits at a time until its zero,
        // writing out the bytes in what amounts to little-endian order.
        while (multibyte) {
            multibyte = length > 0b01111111 ? 0b10000000 : 0b0;
            byte = multibyte | (length & 0b01111111);
            const unpaddedChunk = byte.toString(16);
            const paddedChunk = '0'.repeat(2 - unpaddedChunk.length) + unpaddedChunk;
            write(paddedChunk, 'hex');
            length = length >>> 7;
        }
        // Lastly, we can compress and write the object.
        write(Buffer.from(pako_1.default.deflate(object)));
    }
    write('PACK');
    write('00000002', 'hex');
    // Write a 4 byte (32-bit) int
    const unpaddedChunk = oids.length.toString(16);
    const paddedChunk = '0'.repeat(8 - unpaddedChunk.length) + unpaddedChunk;
    write(paddedChunk, 'hex');
    for (let oid of oids) {
        let { type, object } = await GitObjectManager_1.default.read(fileSystem, gitdir, oid);
        writeObject(object, type);
    }
    // Write SHA1 checksum
    let digest = hash.digest();
    outputStream.end(digest);
    return outputStream;
}
exports.pack = pack;
exports.default = packObjects;
//# sourceMappingURL=packObjects.js.map