"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const GitPktLine_1 = __importDefault(require("./GitPktLine"));
const GitRefManager_1 = __importDefault(require("./GitRefManager"));
async function writeRefsAdResponse({ capabilities, refs, symrefs }) {
    const stream = [];
    // Compose capabilities string
    let syms = '';
    for (const [key, value] of Object.entries(symrefs)) {
        syms += `symref=${key}:${value} `;
    }
    let caps = `\x00${[...capabilities].join(' ')} ${syms}agent=git/isomorphic-git@1.4.0`;
    // stream.write(GitPktLine.encode(`# service=${service}\n`))
    // stream.write(GitPktLine.flush())
    // Note: In the edge case of a brand new repo, zero refs (and zero capabilities)
    // are returned.
    for (const [key, value] of Object.entries(refs)) {
        stream.push(GitPktLine_1.default.encode(`${value} ${key}${caps}\n`));
        caps = '';
    }
    stream.push(GitPktLine_1.default.flush());
    return stream;
}
async function uploadPack(fileSystem, dir, gitdir = path_1.default.join(dir, '.git'), advertiseRefs = false) {
    try {
        if (advertiseRefs) {
            // Send a refs advertisement
            const capabilities = [
                'side-band-64k',
            ];
            let keys = await GitRefManager_1.default.listRefs(fileSystem, gitdir, 'refs');
            keys = keys.map(ref => `refs/${ref}`);
            const refs = {};
            keys.unshift('HEAD'); // HEAD must be the first in the list
            for (const key of keys) {
                refs[key] = await GitRefManager_1.default.resolve(fileSystem, gitdir, key);
            }
            const symrefs = {};
            symrefs['HEAD'] = await GitRefManager_1.default.resolve(fileSystem, gitdir, 'HEAD', 2);
            return writeRefsAdResponse({
                capabilities,
                refs,
                symrefs,
            });
        }
    }
    catch (err) {
        err.caller = 'git.uploadPack';
        throw err;
    }
}
exports.default = uploadPack;
//# sourceMappingURL=uploadPack.js.map