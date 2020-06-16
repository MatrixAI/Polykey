import pako from 'pako'
import path from 'path'
import fs from 'fs'

import GitObject from './GitObject'
import { GitPackIndex } from './GitPackIndex'
import { EncryptedFS } from 'encryptedfs'

const PackfileCache = new Map()

class GitObjectManager {
  static async read(fileSystem: EncryptedFS, gitdir: string, oid: string, format = 'content') {
    // Look for it in the loose object directory.
    let file = fileSystem.readFileSync(`${gitdir}/objects/${oid.slice(0, 2)}/${oid.slice(2)}`)
    let source = `./objects/${oid.slice(0, 2)}/${oid.slice(2)}`
    // Check to see if it's in a packfile.
    if (!file) {
      // Curry the current read method so that the packfile un-deltification
      // process can acquire external ref-deltas.
      const getExternalRefDelta = oid =>
        GitObjectManager.read(fileSystem, gitdir, oid)
      // Iterate through all the .pack files
      let list = fs.readdirSync(path.join(gitdir, '/objects/pack'))
      list = list.filter(x => x.endsWith('.pack'))
      for (let filename of list) {
        // Try to get the packfile from the in-memory cache
        let p = PackfileCache.get(filename)
        if (!p) {
          // If not there, load it from a .idx file
          const idxName = filename.replace(/pack$/, 'idx')
          if (fileSystem.existsSync(`${gitdir}/objects/pack/${idxName}`)) {
            const idx = fileSystem.readFileSync(`${gitdir}/objects/pack/${idxName}`)
            p = await GitPackIndex.fromIdx({ idx, getExternalRefDelta })
          } else {
            // If the .idx file isn't available, generate one.
            const pack = fileSystem.readFileSync(`${gitdir}/objects/pack/${filename}`)
            p = await GitPackIndex.fromPack({ pack, getExternalRefDelta })
            // Save .idx file
            fileSystem.writeFileSync(`${gitdir}/objects/pack/${idxName}`, p.toBuffer())
          }
          PackfileCache.set(filename, p)
        }
        // console.log(p)
        // If the packfile DOES have the oid we're looking for...
        if (p.offsets.has(oid)) {
          // Make sure the packfile is loaded in memory
          if (!p.pack) {
            const pack = fileSystem.readFileSync(`${gitdir}/objects/pack/${filename}`)
            await p.load({ pack })
          }
          // Get the resolved git object from the packfile
          let result = await p.read({ oid, getExternalRefDelta })
          result.source = `./objects/pack/${filename}`
          return result
        }
      }
    }
    // Check to see if it's in shallow commits.
    if (!file) {
      let text = await fileSystem.readFileSync(`${gitdir}/shallow`, { encoding: 'utf8' })
      if (text !== null && text.includes(oid)) {
        throw(new Error(`ReadShallowObjectFail: ${oid}`))
      }
    }
    // Finally
    if (!file) {
      throw(new Error(`ReadObjectFail: ${oid}`))
    }
    if (format === 'deflated') {
      return { format: 'deflated', object: file, source }
    }
    let buffer = Buffer.from(pako.inflate(file))
    if (format === 'wrapped') {
      return { format: 'wrapped', object: buffer, source }
    }
    let { type, object } = GitObject.unwrap({ oid, buffer })
    if (format === 'content') return { type, format: 'content', object, source }
  }
}

export default GitObjectManager
