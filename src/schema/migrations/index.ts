/**
 * Create migration functions in this module
 * Migration functions can be created as files
 * These files should be named with the state version
 * they are upgrading to
 * For example a `./2.ts` can be:
 * ```ts
 * export default async function (nodePath: string) { };
 * ```
 * The nodePath passed in won't be the real node path.
 * It will be temporary directory containing a copy.
 * Only when all migrations are successful will the final node path
 * be copied back
 * @module
 */
import type { StateVersion, Migration } from '../types';

const migrations: Map<StateVersion, Migration> = new Map();

export default migrations;
