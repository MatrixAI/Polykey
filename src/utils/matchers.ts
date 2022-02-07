import { isDeepStrictEqual } from 'util';

type Proc<T> = (data: any) => Promise<T> | T;
type Case<T> = [...patterns: [any, ...Array<any>], proc: Proc<T>];

type ProcSync<T> = (data: any) => T;
type CaseSync<T> = [...patterns: [any, ...Array<any>], proc: ProcSync<T>];

/**
 * Poor man's pattern matching in JS
 * Use it like a switch-case that is capable of doing deep equality
 * Unlike switch-case, it cannot assert the data type in the procedure
 * Without a default case, the returned value is undefined
 */
function match<T>(
  data: any,
): (
  ...cases: readonly [...Array<Case<T>>, Proc<T>] | readonly [...Array<Case<T>>]
) => Promise<T> {
  return async (...cases) => {
    for (const case_ of cases) {
      // Default case
      if (typeof case_ === 'function') {
        return await case_(data);
      }
      // Last item has to be the procedure
      const [proc, ...patterns] = [case_.pop(), ...case_];
      for (const p of patterns) {
        if (isDeepStrictEqual(data, p)) {
          return await proc(data);
        }
      }
    }
    return;
  };
}

/**
 * Poor man's pattern matching in JS
 * Use it like a switch-case that is capable of doing deep equality
 * Unlike switch-case, it cannot assert the data type in the procedure
 * Without a default case, the returned value is undefined
 * Synchronous version
 */
function matchSync<T>(
  data: any,
): (
  ...cases:
    | readonly [...Array<CaseSync<T>>, ProcSync<T>]
    | readonly [...Array<CaseSync<T>>]
) => T {
  return (...cases) => {
    for (const case_ of cases) {
      // Default case
      if (typeof case_ === 'function') {
        return case_(data);
      }
      // Last item has to be the procedure
      const [proc, ...patterns] = [case_.pop(), ...case_];
      for (const p of patterns) {
        if (isDeepStrictEqual(data, p)) {
          return proc(data);
        }
      }
    }
    return;
  };
}

export { match, matchSync };
