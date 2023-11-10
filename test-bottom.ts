import type { NodeId } from './src/nodes/types';
import { IdInternal } from '@matrixai/id';
import * as utils from './src/utils';
import * as nodesUtils from './src/nodes/utils';

type NodeGraph = Array<[number, NodeId, number, bigint]>;

// 1 byte node ids
function generateNodeIds(amount: number) {
  if (amount < 0 || amount > 256) { throw new RangeError() };
  const nodeIds: Array<NodeId> = Array.from(
    { length: amount },
    (_, i) => IdInternal.create<NodeId>(utils.bigInt2Bytes(BigInt(i), 1))
  );
  return nodeIds;
}

function calculateNodeGraph(nodeIds: Array<NodeId>, nodeId: NodeId): NodeGraph {
  // index, node ID, bucket index, distance
  const results: Array<[
    number, NodeId, number, bigint
  ]> = [];
  for (let i = 0; i < nodeIds.length; i++) {
    if (nodeId.equals(nodeIds[i])) {
      continue;
    }
    let bucketIndex;
    let distance;
    bucketIndex = nodesUtils.bucketIndex(nodeId, nodeIds[i]);
    distance = nodesUtils.nodeDistance(nodeId, nodeIds[i]);
    results.push(
      [
        i,
        nodeIds[i],
        bucketIndex,
        distance
      ]
    );
  }
  return results;
}

function farthestNodes(nodeGraph: NodeGraph, limit: number): NodeGraph {
  const resultsSorted = [...nodeGraph].sort(([, , , distance1], [, , , distance2]) => {
    if (distance1 < distance2) return 1;
    if (distance1 > distance2) return -1;
    return 0;
  });
  const closestK = resultsSorted.slice(0, limit);
  return closestK;
}

async function main () {
  const visitedNodes = new Set<number>();
  const pendingNodes = new Set<number>();
  const nodeIds = generateNodeIds(256);

  const K = 65;

  const nodeGraph1 = calculateNodeGraph(nodeIds, nodeIds[77]);
  const closestK1 = farthestNodes(nodeGraph1, K);

  for (const [index,nodeId] of closestK1) {
    pendingNodes.add(index);
  }

  while (pendingNodes.size > 0) {
    const [index] = pendingNodes;
    pendingNodes.delete(index);

    visitedNodes.add(index);
    const nodeGraph = calculateNodeGraph(nodeIds, nodeIds[index]);
    const closestK = farthestNodes(nodeGraph, K);
    for (const [index, nodeId] of closestK) {
      if (!visitedNodes.has(index)) pendingNodes.add(index);
    }
  }

  console.log(visitedNodes);
  console.log(visitedNodes.size);

}

main();
