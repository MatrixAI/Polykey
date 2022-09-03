// This function detects if a string is printable
function isPrintable (str: string): boolean {
  return /^[\x20-\x7E]*$/.test(str);
}

// This is an example of an unprintable string
const unprintable = 'a\x00b';

// This is another example of an unprintable string
const unprintable2 = 'a\x1Ab';

console.log(isUnicodePrintable(unprintable)); // false
console.log(isUnicodePrintable(unprintable2)); // false

function isUnicodePrintable (str: string): boolean {
  return /^[\u0020-\u007E]*$/.test(str);
}
