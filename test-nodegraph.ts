import type { NodeId, NodeAddress } from './src/nodes/types';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from './src/keys/utils';
import * as nodesUtils from './src/nodes/utils';
import NodeGraph from './src/nodes/NodeGraph';
import KeyManager from './src/keys/KeyManager';

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

  const db = await DB.createDB({
    dbPath: './tmp/db'
  });

  const keyManager = await KeyManager.createKeyManager({
    keysPath: './tmp/keys',
    password: 'abc123',
    // fresh: true
  });

  const nodeGraph = await NodeGraph.createNodeGraph({
    db,
    keyManager,
    fresh: true
  });

  for (let i = 0; i < 10; i++) {
    await nodeGraph.setNode(
      generateRandomNodeId(),
      {
        host: '127.0.0.1',
        port: 55555
      } as NodeAddress
    );
  }

  for await (const [bucketIndex, bucket] of nodeGraph.getBuckets()) {

    // the bucket lengths are wrong
    console.log(
      'BucketIndex',
      bucketIndex,
      'Bucket Count',
      bucket.length,
    );

    // console.log(bucket);
    for (const [nodeId, nodeData] of bucket) {
      // console.log('NODEID', nodeId);
      // console.log('NODEDATA', nodeData);
      // console.log(nodeData.address);
    }
  }

  for await (const [nodeId, nodeData] of nodeGraph.getNodes()) {
    // console.log(nodeId, nodeData);
  }

  const bucket = await nodeGraph.getBucket(255, 'lastUpdated');
  console.log(bucket.length);

  // console.log('OLD NODE ID', keyManager.getNodeId());
  // const newNodeId = generateRandomNodeId();
  // console.log('NEW NODE ID', newNodeId);

  // console.log('---------FIRST RESET--------');

  // await nodeGraph.resetBuckets(newNodeId);
  // for await (const [bucketIndex, bucket] of nodeGraph.getBuckets()) {
  //   console.log(
  //     'BucketIndex',
  //     bucketIndex,
  //     'Bucket Count',
  //     Object.keys(bucket).length
  //   );
  // }


  // console.log('---------SECOND RESET--------');
  // const newNodeId2 = generateRandomNodeId();
  // await nodeGraph.resetBuckets(newNodeId2);

  // for await (const [bucketIndex, bucket] of nodeGraph.getBuckets()) {
  //   console.log(
  //     'BucketIndex',
  //     bucketIndex,
  //     'Bucket Count',
  //     Object.keys(bucket).length
  //   );
  // }

  await nodeGraph.stop();
  await keyManager.stop();
  await db.stop();
}

main();
