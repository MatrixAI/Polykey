import type { Opaque } from '../types.js';

type StateVersion = Opaque<'StateVersion', number>;

type Migration = (nodePath: string) => Promise<void>;

export type { StateVersion, Migration };
