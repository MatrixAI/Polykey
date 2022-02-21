import * as testNodesUtils from './tests/nodes/utils';

const arr = [
  { a: 'abc', b: 3},
  { a: 'abc', b: 1},
  { a: 'abc', b: 0},
];

arr.sort((a, b): number => {
  if (a.b > b.b) {
    return 1;
  } else if (a.b < b.b) {
    return -1;
  } else {
    return 0;
  }
});

console.log(arr);

const arr2 = [3, 1, 0];

arr2.sort();

console.log(arr2);


console.log(testNodesUtils.generateRandomNodeId());
