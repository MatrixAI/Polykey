import type {
  TaskPriority,
  TaskDeadline,
  TaskDelay,
  TaskId,
} from '@/tasks/types';
import { IdInternal } from '@matrixai/id';
import * as tasksUtils from '@/tasks/utils';

describe('tasks/utils', () => {
  test('encode priority from `int8` to flipped `uint8`', () => {
    expect(tasksUtils.toPriority(128)).toBe(0);
    expect(tasksUtils.toPriority(127)).toBe(0);
    expect(tasksUtils.toPriority(126)).toBe(1);
    expect(tasksUtils.toPriority(2)).toBe(125);
    expect(tasksUtils.toPriority(1)).toBe(126);
    expect(tasksUtils.toPriority(0)).toBe(127);
    expect(tasksUtils.toPriority(-1)).toBe(128);
    expect(tasksUtils.toPriority(-2)).toBe(129);
    expect(tasksUtils.toPriority(-127)).toBe(254);
    expect(tasksUtils.toPriority(-128)).toBe(255);
    expect(tasksUtils.toPriority(-129)).toBe(255);
  });
  test('decode from priority from flipped `uint8` to `int8`', () => {
    expect(tasksUtils.fromPriority(0 as TaskPriority)).toBe(127);
    expect(tasksUtils.fromPriority(1 as TaskPriority)).toBe(126);
    expect(tasksUtils.fromPriority(125 as TaskPriority)).toBe(2);
    expect(tasksUtils.fromPriority(126 as TaskPriority)).toBe(1);
    expect(tasksUtils.fromPriority(127 as TaskPriority)).toBe(0);
    expect(tasksUtils.fromPriority(128 as TaskPriority)).toBe(-1);
    expect(tasksUtils.fromPriority(129 as TaskPriority)).toBe(-2);
    expect(tasksUtils.fromPriority(254 as TaskPriority)).toBe(-127);
    expect(tasksUtils.fromPriority(255 as TaskPriority)).toBe(-128);
  });
  test('toDeadline', async () => {
    expect(tasksUtils.toDeadline(NaN)).toBe(0);
    expect(tasksUtils.toDeadline(0)).toBe(0);
    expect(tasksUtils.toDeadline(100)).toBe(100);
    expect(tasksUtils.toDeadline(1000)).toBe(1000);
    expect(tasksUtils.toDeadline(Infinity)).toBe(null);
  });
  test('fromDeadline', async () => {
    expect(tasksUtils.fromDeadline(0 as TaskDeadline)).toBe(0);
    expect(tasksUtils.fromDeadline(100 as TaskDeadline)).toBe(100);
    expect(tasksUtils.fromDeadline(1000 as TaskDeadline)).toBe(1000);
    // @ts-ignore: typescript complains about null here
    expect(tasksUtils.fromDeadline(null as TaskDeadline)).toBe(Infinity);
  });
  test('toDelay', async () => {
    expect(tasksUtils.toDelay(NaN)).toBe(0);
    expect(tasksUtils.toDelay(0)).toBe(0);
    expect(tasksUtils.toDelay(100)).toBe(100);
    expect(tasksUtils.toDelay(1000)).toBe(1000);
    expect(tasksUtils.toDelay(2 ** 31 - 1)).toBe(2 ** 31 - 1);
    expect(tasksUtils.toDelay(2 ** 31 + 100)).toBe(2 ** 31 - 1);
    expect(tasksUtils.toDelay(Infinity)).toBe(2 ** 31 - 1);
  });
  test('fromDelay', async () => {
    expect(tasksUtils.fromDelay((2 ** 31 - 1) as TaskDelay)).toBe(2 ** 31 - 1);
    expect(tasksUtils.fromDelay((2 ** 31 + 100) as TaskDelay)).toBe(
      2 ** 31 + 100,
    );
    expect(tasksUtils.fromDelay(1000 as TaskDelay)).toBe(1000);
    expect(tasksUtils.fromDelay(100 as TaskDelay)).toBe(100);
    expect(tasksUtils.fromDelay(0 as TaskDelay)).toBe(0);
  });
  test('encodeTaskId', async () => {
    const taskId1 = IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 0));
    const taskId2 = IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 100));
    const taskId3 = IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 255));

    expect(tasksUtils.encodeTaskId(taskId1)).toBe(
      'v00000000000000000000000000',
    );
    expect(tasksUtils.encodeTaskId(taskId2)).toBe(
      'vchi68p34chi68p34chi68p34cg',
    );
    expect(tasksUtils.encodeTaskId(taskId3)).toBe(
      'vvvvvvvvvvvvvvvvvvvvvvvvvvs',
    );
  });
  test('decodeTaskId', async () => {
    const taskId1 = IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 0));
    const taskId2 = IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 100));
    const taskId3 = IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 255));

    expect(
      tasksUtils.decodeTaskId('v00000000000000000000000000')?.equals(taskId1),
    ).toBe(true);
    expect(
      tasksUtils.decodeTaskId('vchi68p34chi68p34chi68p34cg')?.equals(taskId2),
    ).toBe(true);
    expect(
      tasksUtils.decodeTaskId('vvvvvvvvvvvvvvvvvvvvvvvvvvs')?.equals(taskId3),
    ).toBe(true);
  });
});
