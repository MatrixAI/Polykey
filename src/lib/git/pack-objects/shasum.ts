import Hash from 'sha.js/sha1'

// This is modeled after @dominictarr's "shasum" module,
// but without the 'json-stable-stringify' dependency and
// extra type-casting features.
function shasum (buffer: Buffer) {
  return new Hash().update(buffer).digest('hex')
}

export default shasum
