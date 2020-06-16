import path = require("path")
import GitRefManager from '../upload-pack/GitRefManager'
import GitCommit from './GitCommit'
import GitObjectManager from './GitObjectManager'
import { EncryptedFS } from 'encryptedfs'



export async function logCommit (fileSystem: EncryptedFS, gitdir: string, oid: string, signing: boolean) {
  try {
    let { type, object } = await GitObjectManager.read(fileSystem, gitdir, oid)
    if (type !== 'commit') {
      throw(new Error('expected type to be commit'))
    }
    const commit = GitCommit.from(object)
    const result = Object.assign({ oid }, commit.parse())
    if (signing) {
      result.payload = commit.withoutSignature()
    }
    return result
  } catch (err) {
    return {
      oid,
      error: err
    }
  }
}


function compareAge (a, b) {
  return a.committer.timestamp - b.committer.timestamp
}

/**
 * Get commit descriptions from the git history
 *
 * @link https://isomorphic-git.github.io/docs/log.html
 */
async function log (
  fileSystem: EncryptedFS,
  dir,
  gitdir = path.join(dir, '.git'),
  ref = 'HEAD',
  depth,
  since, // Date
  signing = false
) {
  try {
    let sinceTimestamp =
      since === undefined ? undefined : Math.floor(since.valueOf() / 1000)
    // TODO: In the future, we may want to have an API where we return a
    // async iterator that emits commits.
    let commits: any[] = []
    let oid = await GitRefManager.resolve(fileSystem, gitdir, ref)
    let tips /* : Array */ = [await logCommit(fileSystem, gitdir, oid, signing)]

    while (true) {
      let commit = tips.pop()

      // Stop the loop if we encounter an error
      if (commit.error) {
        commits.push(commit)
        break
      }

      // Stop the log if we've hit the age limit
      if (
        sinceTimestamp !== undefined &&
        commit.committer.timestamp <= sinceTimestamp
      ) {
        break
      }

      commits.push(commit)

      // Stop the loop if we have enough commits now.
      if (depth !== undefined && commits.length === depth) break

      // Add the parents of this commit to the queue
      // Note: for the case of a commit with no parents, it will concat an empty array, having no net effect.
      for (const oid of commit.parent) {
        let commit = await logCommit(fileSystem, gitdir, oid, signing)
        if (!tips.map(commit => commit.oid).includes(commit.oid)) {
          tips.push(commit)
        }
      }

      // Stop the loop if there are no more commit parents
      if (tips.length === 0) break

      // Process tips in order by age
      tips.sort(compareAge)
    }
    return commits
  } catch (err) {
    err.caller = 'git.log'
    throw err
  }
}

export default log
