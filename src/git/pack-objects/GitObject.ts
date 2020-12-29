import shasum from './shasum';

class GitObject {
  static hash({ type, object }) {
    const buffer = Buffer.concat([Buffer.from(`${type} ${object.byteLength.toString()}\0`), Buffer.from(object)]);
    const oid = shasum(buffer);
    return oid;
  }

  static wrap({ type, object }) {
    const buffer = Buffer.concat([Buffer.from(`${type} ${object.byteLength.toString()}\0`), object]);
    const oid = shasum(buffer);
    return {
      oid,
      buffer,
    };
  }

  static unwrap({ oid, buffer }) {
    if (oid) {
      const sha = shasum(buffer);
      if (sha !== oid) {
        throw new Error(`SHA check failed! Expected ${oid}, computed ${sha}`);
      }
    }
    const s = buffer.indexOf(32); // first space
    const i = buffer.indexOf(0); // first null value
    const type = buffer.slice(0, s).toString('utf8'); // get type of object
    const length = buffer.slice(s + 1, i).toString('utf8'); // get type of object
    const actualLength = buffer.length - (i + 1);
    // verify length
    if (parseInt(length) !== actualLength) {
      throw new Error(`Length mismatch: expected ${length} bytes but got ${actualLength} instead.`);
    }
    return {
      type,
      object: Buffer.from(buffer.slice(i + 1)),
    };
  }
}

export default GitObject;
