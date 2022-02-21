
function bufferSplit(input: Buffer, delimiter?: Buffer): Array<Buffer> {
  const output: Array<Buffer> = [];
  let delimiterIndex = 0;
  let chunkIndex = 0;
  if (delimiter != null) {
    while (true) {
      const i = input.indexOf(
        delimiter,
        delimiterIndex
      );
      if (i > -1) {
        output.push(input.subarray(chunkIndex, i));
        delimiterIndex = i + delimiter.byteLength;
        chunkIndex = i + delimiter.byteLength;
      } else {
        output.push(input.subarray(chunkIndex));
        break;
      }
    }
  } else {
    for (let i = 0; i < input.byteLength; i++) {
      output.push(input.subarray(i, i + 1));
    }
  }
  return output;
}


const b = Buffer.from('!a!!b!');

console.log(bufferSplit(b, Buffer.from('!!')));
console.log(bufferSplit(b));

const s = '!a!!b!';

console.log(s.split('!!'));
