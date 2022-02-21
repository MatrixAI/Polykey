import { DB } from '@matrixai/db';
import lexi from 'lexicographic-integer';
import { getUnixtime, hex2Bytes } from './src/utils';

async function main () {

  const db = await DB.createDB({
    dbPath: './tmp/orderdb',
    fresh: true
  });

  await db.put([], 'node1', 'value');
  await db.put([], 'node2', 'value');
  await db.put([], 'node3', 'value');
  await db.put([], 'node4', 'value');
  await db.put([], 'node5', 'value');
  await db.put([], 'node6', 'value');
  await db.put([], 'node7', 'value');

  const now = new Date;
  const t1 = new Date(now.getTime() + 1000 * 1);
  const t2 = new Date(now.getTime() + 1000 * 2);
  const t3 = new Date(now.getTime() + 1000 * 3);
  const t4 = new Date(now.getTime() + 1000 * 4);
  const t5 = new Date(now.getTime() + 1000 * 5);
  const t6 = new Date(now.getTime() + 1000 * 6);
  const t7 = new Date(now.getTime() + 1000 * 7);

  // so unix time is only what we really need to know
  // further precision is unlikely
  // and hex-packed time is shorter keys
  // so it is likely faster
  // the only issue is that unpacking requires
  // converting hex into bytes, then into strings

  // console.log(t1.getTime());
  // console.log(getUnixtime(t1));
  // console.log(lexi.pack(getUnixtime(t1), 'hex'));
  // console.log(lexi.pack(t1.getTime(), 'hex'));
  // console.log(t1.toISOString());


  // buckets0!BUCKETINDEX!NODEID
  // buckets0!BUCKETINDEX!date

  // Duplicate times that are put here
  // But differentiate by the node1, node2
  await db.put([], lexi.pack(getUnixtime(t6), 'hex') + '-node1', 'value');
  await db.put([], lexi.pack(getUnixtime(t6), 'hex') + '-node2', 'value');

  await db.put([], lexi.pack(getUnixtime(t1), 'hex') + '-node3', 'value');
  await db.put([], lexi.pack(getUnixtime(t4), 'hex') + '-node4', 'value');
  await db.put([], lexi.pack(getUnixtime(t3), 'hex') + '-node5', 'value');
  await db.put([], lexi.pack(getUnixtime(t2), 'hex') + '-node6', 'value');
  await db.put([], lexi.pack(getUnixtime(t5), 'hex') + '-node7', 'value');

  // await db.put([], t6.toISOString() + '-node1', 'value');
  // await db.put([], t6.toISOString() + '-node2', 'value');

  // await db.put([], t1.toISOString() + '-node3', 'value');
  // await db.put([], t4.toISOString() + '-node4', 'value');
  // await db.put([], t3.toISOString() + '-node5', 'value');
  // await db.put([], t2.toISOString() + '-node6', 'value');
  // await db.put([], t5.toISOString() + '-node7', 'value');

  // Why did this require `-node3`

  // this will awlays get one or the other

  // ok so we if we want to say get a time
  // or order it by time
  // we are goingto have to create read stream over the bucket right?
  // yea so we would have another sublevel, or at least a sublevel formed by the bucket
  // one that is the bucket index
  // so that would be the correct way to do it

  for await (const o of db.db.createReadStream({
    gte: lexi.pack(getUnixtime(t1), 'hex'),
    limit: 1,
    // keys: true,
    // values: true,
    // lte: lexi.pack(getUnixtime(t6))
  })) {

    console.log(o.key.toString());

  }

  await db.stop();


  // so it works
  // now if you give it something liek


}

main();
