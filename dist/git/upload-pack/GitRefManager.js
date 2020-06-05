"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// This is a convenience wrapper for reading and writing files in the 'refs' directory.
const path_1 = __importDefault(require("path"));
const GitPackedRefs_1 = __importDefault(require("./GitPackedRefs"));
// @see https://git-scm.com/docs/git-rev-parse.html#_specifying_revisions
const refpaths = ref => [
    `${ref}`,
    `refs/${ref}`,
    `refs/tags/${ref}`,
    `refs/heads/${ref}`,
    `refs/remotes/${ref}`,
    `refs/remotes/${ref}/HEAD`,
];
function compareRefNames(a, b) {
    // https://stackoverflow.com/a/40355107/2168416
    const _a = a.replace(/\^\{\}$/, '');
    const _b = b.replace(/\^\{\}$/, '');
    const tmp = -(_a < _b) || +(_a > _b);
    if (tmp === 0) {
        return a.endsWith('^{}') ? 1 : -1;
    }
    return tmp;
}
// @see https://git-scm.com/docs/gitrepository-layout
const GIT_FILES = ['config', 'description', 'index', 'shallow', 'commondir'];
// This function is used to get all the files in the refs folder for listRefs function
async function recursiveDirectoryWalk(dir, fileSystem) {
    return new Promise((resolve, reject) => {
        let results = [];
        fileSystem.promises.readdir(dir).then(async (list) => {
            var pending = list.length;
            if (!pending)
                return resolve(results);
            list.forEach(async function (file) {
                file = path_1.default.resolve(dir, file);
                fileSystem.promises.stat(file).then(async (stat) => {
                    if (stat && stat.isDirectory()) {
                        const res = await recursiveDirectoryWalk(file, fileSystem);
                        results = results.concat(res);
                        if (!--pending)
                            resolve(results);
                    }
                    else {
                        results.push(file);
                        if (!--pending)
                            resolve(results);
                    }
                });
            });
        }).catch((err) => {
            if (err)
                return reject(err);
        });
    });
}
;
class GitRefManager {
    static async packedRefs(fileSystem, gitdir) {
        const text = fileSystem.readFileSync(`${gitdir}/packed-refs`, { encoding: 'utf8' });
        const packed = GitPackedRefs_1.default.from(text);
        return packed.refs;
    }
    // List all the refs that match the `filepath` prefix
    static async listRefs(fileSystem, gitdir, filepath) {
        const packedMap = GitRefManager.packedRefs(fileSystem, gitdir);
        let files = [];
        try {
            files = await recursiveDirectoryWalk(`${gitdir}/${filepath}`, fileSystem);
            files = files.map(x => x.replace(`${gitdir}/${filepath}/`, ''));
        }
        catch (err) {
            files = [];
        }
        for (let key of (await packedMap).keys()) {
            // filter by prefix
            if (key.startsWith(filepath)) {
                // remove prefix
                key = key.replace(filepath + '/', '');
                // Don't include duplicates; the loose files have precedence anyway
                if (!files.includes(key)) {
                    files.push(key);
                }
            }
        }
        // since we just appended things onto an array, we need to sort them now
        files.sort(compareRefNames);
        return files;
    }
    static async resolve(fileSystem, gitdir, ref, depth) {
        if (depth !== undefined) {
            depth--;
            if (depth === -1) {
                return ref;
            }
        }
        // Is it a ref pointer?
        if (ref.startsWith('ref: ')) {
            ref = ref.slice('ref: '.length);
            return GitRefManager.resolve(fileSystem, gitdir, ref, depth);
        }
        // Is it a complete and valid SHA?
        if (ref.length === 40 && /[0-9a-f]{40}/.test(ref)) {
            return ref;
        }
        // We need to alternate between the file system and the packed-refs
        const packedMap = await GitRefManager.packedRefs(fileSystem, gitdir);
        // Look in all the proper paths, in this order
        const allpaths = refpaths(ref).filter(p => !GIT_FILES.includes(p)); // exclude git system files (#709)
        for (const ref of allpaths) {
            const sha = (fileSystem.readFileSync(`${gitdir}/${ref}`, { encoding: 'utf8' }).toString()) || packedMap.get(ref);
            if (sha) {
                return GitRefManager.resolve(fileSystem, gitdir, sha.trim(), depth);
            }
        }
        // Do we give up?
        throw (Error('RefNotFound'));
    }
}
exports.default = GitRefManager;
//# sourceMappingURL=GitRefManager.js.map