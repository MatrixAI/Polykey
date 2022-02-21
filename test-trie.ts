import * as utils from './src/utils';
import * as nodesUtils from './src/nodes/utils';

// 110
const ownNodeId = Buffer.from([6]);

const i = 2;

const maxDistance = utils.bigInt2Bytes(BigInt(2 ** i));
const minDistance = utils.bigInt2Bytes(BigInt(2 ** (i - 1)));

console.log('max distance', maxDistance, utils.bytes2Bits(maxDistance));
console.log('min distance', minDistance, utils.bytes2Bits(minDistance));

// ownNodeId XOR maxdistance = GTE node id
const gte = ownNodeId.map((byte, i) => byte ^ maxDistance[i]);

// ownNodeId XOR mindistance = LT node id
const lt = ownNodeId.map((byte, i) => byte ^ minDistance[i]);

console.log('Lowest Distance Node (inc)', gte, utils.bytes2Bits(gte));
console.log('Greatest Distance Node (exc)', lt, utils.bytes2Bits(lt));

// function nodeDistance(nodeId1: Buffer, nodeId2: Buffer): bigint {
//   const distance = nodeId1.map((byte, i) => byte ^ nodeId2[i]);
//   return utils.bytes2BigInt(distance);
// }

// console.log(nodeDistance(ownNodeId, Buffer.from([0])));
