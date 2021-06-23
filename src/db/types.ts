import type { AbstractLevelDOWN, AbstractIterator } from 'abstract-leveldown';
import type { LevelUp } from 'levelup';

type DBLevel<K> = LevelUp<
  AbstractLevelDOWN<K, Buffer>,
  AbstractIterator<K, Buffer>
>;

type DBOp_ = {
  domain: Array<string>;
  key: string;
  value: any;
};

type DBOp =
  | ({
      type: 'put';
    } & DBOp_)
  | ({
      type: 'del';
    } & Omit<DBOp_, 'value'>);

export type { DBLevel, DBOp };
