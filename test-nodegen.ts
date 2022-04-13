import type { NodeId } from './src/nodes/types';
import { IdInternal } from '@matrixai/id';
import * as utils from './src/utils';
import * as nodesUtils from './src/nodes/utils';

async function main () {
    // Create 100 NodeIds
    // They all have a size of 1 byte
    // Numerically they represent 0 - 99
    const nodeIds: Array<NodeId> = Array.from(
      {length: 100},
      (_, i) => IdInternal.create<NodeId>(utils.bigInt2Bytes(BigInt(i), 1))
    );
    console.log(nodeIds);

    const results: Array<any> = [];

    for (let i = 0; i < nodeIds.length; i++) {
      let bucketIndex;
      let distance;
      try {
        // 77 is the chosen NodeId
        bucketIndex = nodesUtils.bucketIndex(nodeIds[77], nodeIds[i]);
        distance = nodesUtils.nodeDistance(nodeIds[77], nodeIds[i]);
      } catch (e) {
        // Ignore the chosen NodeId
      }
      results.push(
        [
          i,
          nodeIds[i],
          bucketIndex,
          distance
        ]
      );
    }

    // Ok now get the 10 closest nodes from 77
    // And for each calculate the their closest set of nodes too

    const resultsSorted = results.slice().sort(([, , , distance1], [, , , distance2]) => {
      if (distance1 < distance2) return -1;
      if (distance1 > distance2) return 1;
      return 0;
    });

    const closestK = resultsSorted.slice(0, 11);

    // console.log(results);
    // console.log(resultsSorted);
    console.log(closestK);

    const results2: Array<any> = [];

    for (let i = 0; i < nodeIds.length; i++) {
      let bucketIndex;
      let distance;
      try {
        // 71 is the chosen
        bucketIndex = nodesUtils.bucketIndex(closestK[9][1], nodeIds[i]);
        distance = nodesUtils.nodeDistance(closestK[9][1], nodeIds[i]);
      } catch (e) {
        // Ignore the chosen NodeId
      }
      results2.push(
        [
          i,
          nodeIds[i],
          bucketIndex,
          distance
        ]
      );
    }

    const resultsSorted2 = results2.slice().sort(([, , , distance1], [, , , distance2]) => {
      if (distance1 < distance2) return -1;
      if (distance1 > distance2) return 1;
      return 0;
    });

    const closestK2 = resultsSorted2.slice(0, 11);

    console.log(closestK2);

}

main();
