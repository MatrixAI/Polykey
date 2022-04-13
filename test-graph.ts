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

for (let n = 0; n < 256; n++) {
  g.addNode(n, IdInternal.create<NodeId>(utils.bigInt2Bytes(BigInt(n), 1)));
}

for (let i = 0; i < 255; i++) {
  for (let j = i + 1; j < 256; j++) {
    const id1 = g.getNode(i)!.data;
    const id2 = g.getNode(j)!.data;
    if (id1 === undefined || id2 === undefined) continue;
    if (nodesUtils.nodeDistance(id1, id2) < BigInt(10)) {
      g.addLink(i, j);
    }
  }
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
