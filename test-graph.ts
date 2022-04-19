import type { NodeId } from './src/nodes/types';
import createGraph from 'ngraph.graph';
import fs from 'fs';
import { IdInternal } from '@matrixai/id';
import * as utils from './src/utils';
import * as nodesUtils from './src/nodes/utils';

const g = createGraph();

function isPowerOfTwo(x: number) {
  return (x != 0) && ((x & (x - 1)) == 0);
}

function isPowerOfFour(x: number) {
  if (x == 0) return false;
  while(x != 1) {
   if (x % 4 != 0)
      return false;
    x = x / 4;
  }
  return true;
}

function randomNodesConnect(nodeIds: Set<number>, limit: number, ownNodeId: number, graph: typeof g) {
  const usedJs = new Set<number>();
  for (let i = 0; i < limit; i++) {
    let j;
    while (true) {
      j = Math.floor(Math.random() * 256);
      if (nodeIds[j] === ownNodeId) continue;
      if (!usedJs.has(j)) break;
    }
    if (!nodeIds.has(j)) continue;
    usedJs.add(j);
    graph.addLink(ownNodeId, j);
  }
}

function randomNodes(limit: number): Set<number> {
  const usedJs = new Set<number>();
  for (let i = 0; i < limit; i++) {
    let j;
    while (true) {
      j = Math.floor(Math.random() * 256);
      if (!usedJs.has(j)) break;
    }
    usedJs.add(j);
  }
  return usedJs;
}

const nodes = randomNodes(100);

for (const i of nodes) {
  g.addNode(i, IdInternal.create<NodeId>(utils.bigInt2Bytes(BigInt(i), 1)));
}

for (const i of nodes) {
  randomNodesConnect(nodes, 2, i, g);
  // for (let j = i + 1; j < 256; j++) {
  //   const n1 = g.getNode(i);
  //   const n2 = g.getNode(j);
  //   if (n1 === undefined || n2 === undefined) continue;
  //   const id1 = n1.data;
  //   const id2 = n2.data;
  //   if (isPowerOfTwo(Number(nodesUtils.nodeDistance(id1, id2)))) {
  //     g.addLink(i, j);
  //   }
  // }
}

// for (let i = 0; i < 256; i += 2) {
//   g.removeNode(i);
// }
// for (let i = 0; i < 256; i += 11) {
//   g.removeNode(i);
// }

let output = {
  nodes: [] as any,
  links: [] as any,
};

g.forEachNode((node) => {
  output.nodes.push({ id: node.id, data: node.data.toJSON().data });
});
g.forEachLink((link) => {
  output.links.push({
    source: link.fromId,
    target: link.toId,
  });
});

fs.writeFile('graph.json', JSON.stringify(output, undefined, '  '), function(err) {
  if (err) {
      return console.error(err);
  }
  console.log("File created!");
});
