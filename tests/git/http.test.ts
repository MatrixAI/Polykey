import fs from 'fs';
import git from 'isomorphic-git';
import * as gitHttp from '@/git/http';

describe('Git utils', () => {
  test('asd', async () => {
    // Testing for the following
    const output = `001e# service=git-upload-pack
0000004895dcfa3633004da0049d3d0fa03f80589cbcaf31 refs/heads/maint\0multi_ack
003fd049f6c27a2244e12041955e262a404c7faba355 refs/heads/master
003c2cb58b79488a98d2721cea644875a8dd0026b115 refs/tags/v1.0
0000`;
    const gen = gitHttp.advertiseRefGenerator(fs as any, '.', '.git');
    let acc = '';
    for await (const out of gen) {
      acc += out;
    }
    console.log(acc);
    // Expect(acc).toBe(output);
  });
  test('packetLine', async () => {
    /**
     *   Pkt-line          actual value
     *   ---------------------------------
     *   "0006a\n"         "a\n"
     *   "0005a"           "a"
     *   "000bfoobar\n"    "foobar\n"
     *   "0004"            ""
     */
    const tests = [
      ['0006a\n', 'a\n'],
      ['0005a', 'a'],
      ['000bfoobar\n', 'foobar\n'],
      ['0004', ''],
    ];
    for (const [output, input] of tests) {
      const result = gitHttp.packetLineBuffer(Buffer.from(input));
      const comp = Buffer.compare(result, Buffer.from(output));
      expect(comp).toBe(0);
    }
  });
  test('parsePackRequest', async () => {
    const data = Buffer.from(
      `0060want 2cfd5c97b8f90f0e613784b10f3dd0bfce1ba91e side-band-64k agent=git/isomorphic-git@1.24.5\n00000009done\n`,
    );
    const [wants, haves, capabilities] = await gitHttp.parsePackRequest([data]);
    expect(wants).toMatchObject(['2cfd5c97b8f90f0e613784b10f3dd0bfce1ba91e']);
    expect(haves).toMatchObject([]);
    expect(capabilities).toMatchObject([
      'side-band-64k',
      'agent=git/isomorphic-git@1.24.5',
    ]);
  });

  test('sendPackData', async () => {
    const gen = gitHttp.generatePackData(fs as any, '.', '.git', [
      '2cfd5c97b8f90f0e613784b10f3dd0bfce1ba91e',
    ]);
    let acc = '';
    for await (const out of gen) {
      acc += out;
    }
    console.log(acc);
  });

  test('asdgsd', async () => {
    const gen = gitHttp.generatePackRequest(
      fs as any,
      'tmp/testgit',
      'tmp/testgit/.git',
      [],
    );
    let acc = '';
    for await (const asd of gen) {
      acc += asd.toString();
    }
    console.log(acc);
  });
});
