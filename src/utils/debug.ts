function isPrintableASCII(str: string): boolean {
  return /^[\x20-\x7E]*$/.test(str);
}

/**
 * Used for debugging DB dumps
 */
function inspectBufferStructure(obj: any): any {
  if (obj instanceof Buffer) {
    const str = obj.toString('utf8');
    if (isPrintableASCII(str)) {
      return str;
    } else {
      return '0x' + obj.toString('hex');
    }
  } else if (Array.isArray(obj)) {
    return obj.map(inspectBufferStructure);
  } else if (typeof obj === 'object') {
    const obj_: any = {};
    for (const k in obj) {
      obj_[k] = inspectBufferStructure(obj[k]);
    }
    return obj_;
  } else {
    return obj;
  }
}

export {
  isPrintableASCII,
  inspectBufferStructure,
};
