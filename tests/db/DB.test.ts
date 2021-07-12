import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@/db';
import { KeyManager } from '@/keys';

describe('DB', () => {
  const logger = new Logger('DB Test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let keyManager: KeyManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
  });
  afterEach(async () => {
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('construction has no side effects', async () => {
    const dbPath = `${dataDir}/db`;
    new DB({ dbPath, logger });
    await expect(fs.promises.stat(dbPath)).rejects.toThrow(/ENOENT/);
  });
  test('async start constructs the db leveldb', async () => {
    const dbPath = `${dataDir}/db`;
    const db = new DB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    const dbPathContents = await fs.promises.readdir(dbPath);
    expect(dbPathContents.length).toBeGreaterThan(1);
    await db.stop();
  });
  test('start and stop preserves the db key', async () => {
    const dbPath = `${dataDir}/db`;
    const db = new DB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    const dbKey = await fs.promises.readFile(`${dataDir}/db/db_key`);
    await db.stop();
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    const dbKey_ = await fs.promises.readFile(`${dataDir}/db/db_key`);
    await db.stop();
    expect(dbKey).toEqual(dbKey_);
  });
  test(
    'get and put and del',
    async () => {
      const dbPath = `${dataDir}/db`;
      const db = new DB({ dbPath, logger });
      await db.start({
        keyPair: keyManager.getRootKeyPair(),
      });
      await db.put([], 'a', 'value0');
      expect(await db.get([], 'a')).toBe('value0');
      await db.del([], 'a');
      expect(await db.get([], 'a')).toBeUndefined();
      await db.level<string>('level1');
      await db.put(['level1'], 'a', 'value1');
      expect(await db.get(['level1'], 'a')).toBe('value1');
      await db.del(['level1'], 'a');
      expect(await db.get(['level1'], 'a')).toBeUndefined();
      await db.stop();
    },
    global.defaultTimeout * 2,
  );
  test('db levels are leveldbs', async () => {
    const dbPath = `${dataDir}/db`;
    const db = new DB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    await db.db.put('a', db.serializeEncrypt('value0'));
    expect(await db.get([], 'a')).toBe('value0');
    await db.put([], 'b', 'value0');
    expect(db.unserializeDecrypt(await db.db.get('b'))).toBe('value0');
    const level1 = await db.level<string>('level1');
    await level1.put('a', db.serializeEncrypt('value1'));
    expect(await db.get(['level1'], 'a')).toBe('value1');
    await db.put(['level1'], 'b', 'value1');
    expect(db.unserializeDecrypt(await level1.get('b'))).toBe('value1');
    await db.stop();
  });
  test('clearing a level clears all sublevels', async () => {
    const dbPath = `${dataDir}/db`;
    const db = new DB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    const level1 = await db.level<string>('level1');
    await db.level<string>('level2', level1);
    await db.put([], 'a', 'value0');
    await db.put(['level1'], 'a', 'value1');
    await db.put(['level1', 'level2'], 'a', 'value2');
    expect(await db.get([], 'a')).toBe('value0');
    expect(await db.get(['level1'], 'a')).toBe('value1');
    expect(await db.get(['level1', 'level2'], 'a')).toBe('value2');
    await level1.clear();
    expect(await db.get([], 'a')).toBe('value0');
    expect(await db.get(['level1'], 'a')).toBeUndefined();
    expect(await db.get(['level1', 'level2'], 'a')).toBeUndefined();
    await db.stop();
  });
});
