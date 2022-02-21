import type { NodeId } from './src/nodes/types';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from './src/keys/utils';
import * as nodesUtils from './src/nodes/utils';

function generateRandomNodeId(readable: boolean = false): NodeId {
  if (readable) {
    const random = keysUtils.getRandomBytesSync(16).toString('hex');
    return IdInternal.fromString<NodeId>(random);
  } else {
    const random = keysUtils.getRandomBytesSync(32);
    return IdInternal.fromBuffer<NodeId>(random);
  }
}

async function main () {

  const firstNodeId = generateRandomNodeId();


  let lastBucket = 0;
  let penultimateBucket = 0;
  let lowerBuckets = 0;

  for (let i = 0; i < 1000; i++) {
    const nodeId = generateRandomNodeId();
    const bucketIndex = nodesUtils.bucketIndex(firstNodeId, nodeId);
    if (bucketIndex === 255) {
      lastBucket++;
    } else if (bucketIndex === 254) {
      penultimateBucket++;
    } else {
      lowerBuckets++;
    }
  }

  console.log(lastBucket);
  console.log(penultimateBucket);
  console.log(lowerBuckets);


}

main();
