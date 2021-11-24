import type { Opaque } from '../types';

type StateVersion = Opaque<'StateVersion', number>;

type Migration = (nodePath: string) => Promise<void>;

export type { StateVersion, Migration };
