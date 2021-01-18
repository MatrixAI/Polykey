import fs from 'fs';
import pako from 'pako';
import path from 'path';
import GitObject from './GitObject';
import { EncryptedFS } from 'encryptedfs';

const PackfileCache = new Map();

class GitObjectManager {
  static async read(fileSystem: EncryptedFS, gitdir: string, oid: string, format = 'content') {
    // Look for it in the loose object directory.
    const file = fileSystem.readFileSync(`${gitdir}/objects/${oid.slice(0, 2)}/${oid.slice(2)}`);
    const source = `./objects/${oid.slice(0, 2)}/${oid.slice(2)}`;
    // Check to see if it's in a packfile.
    if (!file) {
      // Curry the current read method so that the packfile un-deltification
      // process can acquire external ref-deltas.
      const getExternalRefDelta = (oid) => GitObjectManager.read(fileSystem, gitdir, oid);
      // Iterate through all the .pack files
      let list = fs.readdirSync(path.join(gitdir, '/objects/pack'));
      list = list.filter((x) => x.endsWith('.pack'));
      for (const filename of list) {
        // Try to get the packfile from the in-memory cache
        const p = PackfileCache.get(filename);
        // If the packfile DOES have the oid we're looking for...
        if (p.offsets.has(oid)) {
          // Make sure the packfile is loaded in memory
          if (!p.pack) {
            const pack = fileSystem.readFileSync(`${gitdir}/objects/pack/${filename}`);
            await p.load({ pack });
          }
          // Get the resolved git object from the packfile
          const result = await p.read({ oid, getExternalRefDelta });
          result.source = `./objects/pack/${filename}`;
          return result;
        }
      }
    }
    // Check to see if it's in shallow commits.
    if (!file) {
      const text = fileSystem.readFileSync(`${gitdir}/shallow`, { encoding: 'utf8' });
      if (text !== null && text.includes(oid)) {
        throw new Error(`ReadShallowObjectFail: ${oid}`);
      }
    }
    // Finally
    if (!file) {
      throw new Error(`ReadObjectFail: ${oid}`);
    }
    if (format === 'deflated') {
      return { format: 'deflated', object: file, source };
    }
    const buffer = Buffer.from(pako.inflate(file));
    if (format === 'wrapped') {
      return { format: 'wrapped', object: buffer, source };
    }
    const { type, object } = GitObject.unwrap({ oid, buffer });
    if (format === 'content') return { type, format: 'content', object, source };
  }
}

export default GitObjectManager;
