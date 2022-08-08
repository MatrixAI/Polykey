import type { TaskPriority } from '@/tasks/types';
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
});
