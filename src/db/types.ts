import type { AbstractLevelDOWN, AbstractIterator } from 'abstract-leveldown';
import type { LevelUp } from 'levelup';

type DBDomain = Readonly<Array<string>>;

type DBLevel = LevelUp<
  AbstractLevelDOWN<string | Buffer, Buffer>,
  AbstractIterator<Buffer, Buffer>
>;

type DBOp_ =
  | {
      domain: DBDomain;
      key: string | Buffer;
      value: any;
      raw?: false;
    }
  | {
      domain: DBDomain;
      key: string | Buffer;
      value: Buffer;
      raw: true;
    };

type DBOp =
  | ({
      type: 'put';
    } & DBOp_)
  | ({
      type: 'del';
    } & Omit<DBOp_, 'value' | 'raw'>);

type DBOps = Array<DBOp>;

export type { DBDomain, DBLevel, DBOp, DBOps };
