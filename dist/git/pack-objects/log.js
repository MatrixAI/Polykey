"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const GitCommit_1 = __importDefault(require("./GitCommit"));
const GitObjectManager_1 = __importDefault(require("./GitObjectManager"));
const GitRefManager_1 = __importDefault(require("../upload-pack/GitRefManager"));
async function logCommit(fileSystem, gitdir, oid, signing) {
    try {
        let { type, object } = await GitObjectManager_1.default.read(fileSystem, gitdir, oid);
        if (type !== 'commit') {
            throw (new Error('expected type to be commit'));
        }
        const commit = GitCommit_1.default.from(object);
        const result = Object.assign({ oid }, commit.parse());
        if (signing) {
            result.payload = commit.withoutSignature();
        }
        return result;
    }
    catch (err) {
        return {
            oid,
            error: err
        };
    }
}
exports.logCommit = logCommit;
function compareAge(a, b) {
    return a.committer.timestamp - b.committer.timestamp;
}
/**
 * Get commit descriptions from the git history
 *
 * @link https://isomorphic-git.github.io/docs/log.html
 */
async function log(fileSystem, dir, gitdir = path.join(dir, '.git'), ref = 'HEAD', depth, since, // Date
signing = false) {
    try {
        let sinceTimestamp = since === undefined ? undefined : Math.floor(since.valueOf() / 1000);
        // TODO: In the future, we may want to have an API where we return a
        // async iterator that emits commits.
        let commits = [];
        let oid = await GitRefManager_1.default.resolve(fileSystem, gitdir, ref);
        let tips /* : Array */ = [await logCommit(fileSystem, gitdir, oid, signing)];
        while (true) {
            let commit = tips.pop();
            // Stop the loop if we encounter an error
            if (commit.error) {
                commits.push(commit);
                break;
            }
            // Stop the log if we've hit the age limit
            if (sinceTimestamp !== undefined &&
                commit.committer.timestamp <= sinceTimestamp) {
                break;
            }
            commits.push(commit);
            // Stop the loop if we have enough commits now.
            if (depth !== undefined && commits.length === depth)
                break;
            // Add the parents of this commit to the queue
            // Note: for the case of a commit with no parents, it will concat an empty array, having no net effect.
            for (const oid of commit.parent) {
                let commit = await logCommit(fileSystem, gitdir, oid, signing);
                if (!tips.map(commit => commit.oid).includes(commit.oid)) {
                    tips.push(commit);
                }
            }
            // Stop the loop if there are no more commit parents
            if (tips.length === 0)
                break;
            // Process tips in order by age
            tips.sort(compareAge);
        }
        return commits;
    }
    catch (err) {
        err.caller = 'git.log';
        throw err;
    }
}
exports.default = log;
//# sourceMappingURL=log.js.map