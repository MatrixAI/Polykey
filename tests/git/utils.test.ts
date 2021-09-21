import fs from 'fs';
import os from 'os';
import path from 'path';

import * as gitUtils from '@/git/utils';
import * as gitTestUtils from './utils';
import * as gitErrors from '@/git/errors';
import { PackIndex } from '@/git/types';
import { ReadCommitResult } from 'isomorphic-git';

describe('Git utils', () => {
  let dataDir: string;
  let commits: ReadCommitResult[];
  let firstCommit: ReadCommitResult;
  let objectsPath: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    commits = await gitTestUtils.createGitRepo({ basePath: dataDir, packFile: true, indexFile: true });
    firstCommit = commits[0];
    objectsPath = path.join(dataDir, '.git', 'objects');
  });

  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  describe('Git Pack Index', () => {
    test('from .idx', async () => {
      const packDir = path.join(dataDir, '.git', 'objects', 'pack');
      const packfile = (await fs.promises.readdir(packDir))[0];
      const idx = await fs.promises.readFile(
        path.join(
          packDir,
          packfile
        )
      );
      const p = gitUtils.fromIdx(idx) as PackIndex;
      expect(p).not.toBeUndefined();
      const packSha = packfile.substring(5, 45);
      expect(p.packfileSha).toBe(packSha);
      const oids = commits.map((commit) => commit.oid);
      for (const oid of oids) {
        expect(p.offsets.has(oid)).toBeTruthy();
      }
    });
  });
  describe.skip('Git Ref Manager', () => {
    test('listRefs', async () => {
      let refs = await gitUtils.listRefs(
        fs,
        path.join(dataDir, '.git'),
        'refs/heads',
      );
      expect(refs).toEqual(['master']);
    });
  });
  test('encode string', async () => {
    const foo = gitUtils.encode('hello world\n')
    expect(foo).toBeTruthy()
    expect(Buffer.compare(foo, Buffer.from('0010hello world\n')) === 0).toBe(
      true
    )
  });
  test('encode empty string', async () => {
    const foo = gitUtils.encode('')
    expect(foo).toBeTruthy()
    expect(Buffer.compare(foo, Buffer.from('0004')) === 0).toBe(true)
  });
  test('upload pack', async () => {
    const res = await gitUtils.uploadPack(fs, path.join(dataDir, '.git'), true) as Buffer[];
    const buffer = Buffer.concat(res);
    expect(buffer.toString('utf8')).toBe(
      `007d${firstCommit.oid} HEAD\0side-band-64k symref=HEAD:refs/heads/master agent=git/isomorphic-git@1.8.1
003f${firstCommit.oid} refs/heads/master
0000`
    )
  });
  describe('Resolve refs', () => {
    test('resolving a commit oid', async () => {
      const ref = await gitUtils.resolve(
        fs,
        path.join(dataDir, '.git'),
        commits[0].oid,
      );
      expect(ref).toBe(firstCommit.oid)
    });
    test('HEAD', async () => {
      const ref = await gitUtils.resolve(
        fs,
        path.join(dataDir, '.git'),
        'HEAD',
      )
      expect(ref).toBe(firstCommit.oid)
    })
    test('HEAD depth', async () => {
      const ref = await gitUtils.resolve(
        fs,
        path.join(dataDir, '.git'),
        'HEAD',
        2,
      );
      expect(ref).toBe('refs/heads/master')
    })
    test('non-existant refs', async () => {
      await expect(
        gitUtils.resolve(
          fs,
          path.join(dataDir, '.git'),
          'this-is-not-a-ref',
        )
      ).rejects.toThrow(gitErrors.ErrorGitUndefinedRefs);
    });
  });
  describe('read object', () => {
    test('object missing', async () => {
      await expect(
        gitUtils.readObject({
          fs: fs,
          gitdir: path.join(dataDir, '.git'),
          oid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        })
      ).rejects.toThrow(gitErrors.ErrorGitReadObject);
    });
    test('parsed', async () => {
      const ref = await gitUtils.readObject({
        fs: fs,
        gitdir: path.join(dataDir, '.git'),
        oid: firstCommit.oid,
      });
      expect(ref.format).toEqual('parsed')
      expect(ref.type).toEqual('commit')
    })
    test('content', async () => {
      const ref = await gitUtils.readObject({
        fs,
        gitdir: path.join(dataDir, '.git'),
        oid: firstCommit.oid,
        format: 'content',
      });
      expect(ref.format).toEqual('content');
      expect(ref.type).toEqual('commit');
      expect(ref.source).toBe(path.join('objects', firstCommit.oid.substring(0, 2), firstCommit.oid.substring(2)));
      // Find out how to know what to expect here
      // expect(Buffer.from(ref.object).toString('hex')).toMatchInlineSnapshot(
      //   '"7472656520653062386633353734303630656532346530336534616633383936663635646432303861363063630a706172656e7420623466383230366439653335393431366230663334323338636265623430306637646138383961380a617574686f722057696c6c2048696c746f6e203c776d68696c746f6e40676d61696c2e636f6d3e2031353032343834323030202d303430300a636f6d6d69747465722057696c6c2048696c746f6e203c776d68696c746f6e40676d61696c2e636f6d3e2031353032343834323030202d303430300a677067736967202d2d2d2d2d424547494e20504750205349474e41545552452d2d2d2d2d0a2056657273696f6e3a20476e7550472076310a200a2069514963424141424167414742514a5a6a68626f41416f4a454a594a754b575369366135563555502f3034305366656d4a3133505242587374326542353967730a2033685078323944524b42684674766b2b75532b383532332f6855667279326f655757643659526b636e6b7878415574426e667a566b49394167524963314e544d0a20683558744c4d51756243414b77384a577656766f5845547a7756414f446d646d764334575351434c752b6f706f65362f573752766b7254443070626b774834450a204d586f686135397349575a2f4661635a5836427959716846796b664a4c386743467652537a6a69714249627350375871324d68346a6b414b596c357a785633750a2071436b3236686e684c2b2b6b7766586c75325964477442392b6c6a33706b314e655771523337397a527a68345031304678584a3138715378637a626b41464f590a20366f356837612f4d716c314b71574239454642757043706a79646d704174506f366c3155733461336c6942354c4a76436839786752324874536852346239374f0a206e49705850346e6779347a3955797258587878706951516e2f6b566e2f754b6774764770386e4f46696f6f3631504369396a7332516d5178637375424f654f2b0a2044644671356b32504d4e5a4c77697a74345038454766564a6f50624c68645950346f57694d437559562f32664e68306f7a6c2f713137364847737a6c66726b650a203333325a306d614a3341357849526a30623776524e48563841416c394468656f334c73706a656f765032697963434846503033675370434b644c5242524334540a2058313042424644386e6f434d584a78623571656e72662b654b526438643467374a7463797a7156676b42513638474947383434565752426f6c4f7a78344279350a20634161772f5359495a4733526f7241633131695a37737661306a464953656a6d457a496562754368537a64574f324f4f575256764d6468795a77444c556741620a205169786832626d5067723368396e787132446d6e0a203d342b444e0a202d2d2d2d2d454e4420504750205349474e41545552452d2d2d2d2d0a0a496d70726f7665207265736f6c766552656620746f2068616e646c65206d6f7265206b696e6473206f6620726566732e204164642074657374730a"'
      // );
    });
    test('wrapped', async () => {
      const ref = await gitUtils.readObject({
        fs: fs,
        gitdir: path.join(dataDir, '.git'),
        oid: firstCommit.oid,
        format: 'wrapped',
      });
      expect(ref.format).toEqual('wrapped');
      expect(ref.type).toEqual('wrapped');
      expect(ref.source).toBe(path.join('objects', firstCommit.oid.substring(0, 2), firstCommit.oid.substring(2)));
      // expect(Buffer.from(ref.object).toString('hex')).toMatchInlineSnapshot(
      //   '"636f6d6d69742031313133007472656520653062386633353734303630656532346530336534616633383936663635646432303861363063630a706172656e7420623466383230366439653335393431366230663334323338636265623430306637646138383961380a617574686f722057696c6c2048696c746f6e203c776d68696c746f6e40676d61696c2e636f6d3e2031353032343834323030202d303430300a636f6d6d69747465722057696c6c2048696c746f6e203c776d68696c746f6e40676d61696c2e636f6d3e2031353032343834323030202d303430300a677067736967202d2d2d2d2d424547494e20504750205349474e41545552452d2d2d2d2d0a2056657273696f6e3a20476e7550472076310a200a2069514963424141424167414742514a5a6a68626f41416f4a454a594a754b575369366135563555502f3034305366656d4a3133505242587374326542353967730a2033685078323944524b42684674766b2b75532b383532332f6855667279326f655757643659526b636e6b7878415574426e667a566b49394167524963314e544d0a20683558744c4d51756243414b77384a577656766f5845547a7756414f446d646d764334575351434c752b6f706f65362f573752766b7254443070626b774834450a204d586f686135397349575a2f4661635a5836427959716846796b664a4c386743467652537a6a69714249627350375871324d68346a6b414b596c357a785633750a2071436b3236686e684c2b2b6b7766586c75325964477442392b6c6a33706b314e655771523337397a527a68345031304678584a3138715378637a626b41464f590a20366f356837612f4d716c314b71574239454642757043706a79646d704174506f366c3155733461336c6942354c4a76436839786752324874536852346239374f0a206e49705850346e6779347a3955797258587878706951516e2f6b566e2f754b6774764770386e4f46696f6f3631504369396a7332516d5178637375424f654f2b0a2044644671356b32504d4e5a4c77697a74345038454766564a6f50624c68645950346f57694d437559562f32664e68306f7a6c2f713137364847737a6c66726b650a203333325a306d614a3341357849526a30623776524e48563841416c394468656f334c73706a656f765032697963434846503033675370434b644c5242524334540a2058313042424644386e6f434d584a78623571656e72662b654b526438643467374a7463797a7156676b42513638474947383434565752426f6c4f7a78344279350a20634161772f5359495a4733526f7241633131695a37737661306a464953656a6d457a496562754368537a64574f324f4f575256764d6468795a77444c556741620a205169786832626d5067723368396e787132446d6e0a203d342b444e0a202d2d2d2d2d454e4420504750205349474e41545552452d2d2d2d2d0a0a496d70726f7665207265736f6c766552656620746f2068616e646c65206d6f7265206b696e6473206f6620726566732e204164642074657374730a"'
      // )
    })
    test('deflated', async () => {
      const ref = await gitUtils.readObject({
        fs: fs,
        gitdir: path.join(dataDir, '.git'),
        oid: firstCommit.oid,
        format: 'deflated',
      });
      expect(ref.format).toEqual('deflated');
      expect(ref.type).toEqual('deflated');
      expect(ref.source).toBe(path.join('objects', firstCommit.oid.substring(0, 2), firstCommit.oid.substring(2)));
      // expect(Buffer.from(ref.object).toString('hex')).toMatchInlineSnapshot(
      //   '"78019d93c9cea3481084e7cc53d4ddea76010586d1cc68001b0cde30fc06ec1b4b4161966237e6e9dbd373ed53e729158a487d522a625a55f9005896e5ff183a8c01869194f2c206411162cc210c798cc294976431158524e1a0148a308e9926ec703d8008a51207c544c6bc2023568c60ca238e97e2084708c274938492248712138e03a11df0f3b204fbbc1c680dfe7a55e4e7f66f568579f93da6d53f8015208724c44108bec1cf05e6a37e1007fc3bd9acc9fa3c03dffe1b75679867601b36704de3ac7cdd9cdd4f9d011eeefa9cd67f02a31e6d034c2c0318905fcd58551455c91443bd5a8f2789a8a2506b67ddadf1e0bbb9180a9e70b3d71f4837c595c5f2b6a306fdc0615590b39e013cb1674ede3a0795e8c354ac467725091cbf26b7b47b7314fb7e22de9d22ae8b79566e835aa78b5798b2923966cc9ebf4e0c2042301c4fd731d294c34bb2fcc99b68b0fb5a5e9e72d956493569c877afda715cd1866271ed6f9ca9e8beb6b0898ad71eed18700a280905b937fdc75a0fe34720aaef7b4bf477915a4729d3f4c9719767deaa66d4db9ba0e54e043d0be5702f8565f6f89101ad567022a9c971b52a5e69508edc3d3106555e954fbe29d833f65b87dfc88bb31064b3509f038b955a778e97a850f4cb9d012215c8265c9fda923db4be2aef74756cb4e6f94eaa46196c2a96ecad47215fe6aa70b4268dc873e670fbc1250e8ae4cd8501b5d90436aab3375ae4dbbb0b82796ef2ebb55e175ebd1e0fd930198d545ff49c5291b5b55c7ef6dcb5bace713faa177c5931609be8ad5070f6e9fc38bef26540b6b43352cfa2767424c9dd46d4cf4fda78f7d65c7a26902ee5ba6537e2dee89732ed0afcf926cf3d60155abc22cca6f384d16672ce7b4f529452de124cf963df3c319d6c2e7fc7da5eb7219fb98d76488e8eea68e88b01010b5555df4a35d54e813547428beb2e5de183934809ca36d610bf97d6cb0af52a4a8669480879bea3d2f2b2cc487d0b0c8895f0b576efe6c3e01dda2931cbe68f4d3f85f0a99b2e7e56bbc5c4d1a8117749fc0b77b9f88e379d12f27ebcb6c75ba6440cb8e633e1a2cace3a9ec8f5dc72dbaa66c0df68b53d33ffd76477defeaa248c59351d9d30e8704fcb093b3805030524ac9312838a761814799df480a61f4bda7f074a928001f743cffc00fa8263c9"'
      // )
    });
    test('from packfile', async () => {
      const packName = await gitTestUtils.getPackID(dataDir);
      await fs.promises.rename(path.join(objectsPath, firstCommit.oid.substring(0, 2)), path.join(objectsPath, 'TEST'));
      const ref = await gitUtils.readObject({
        fs: fs,
        gitdir: path.join(dataDir, '.git'),
        oid: firstCommit.oid,
        format: 'deflated',
      })
      expect(ref.format).toEqual('content')
      expect(ref.type).toEqual('commit')
      expect(ref.source).toBe(
        path.join('objects', 'pack', `pack-${packName}.pack`)
      );
      // expect(Buffer.from(ref.object).toString('hex')).toMatchInlineSnapshot(
      //   `"7472656520346431363665323666636639666537623231383633343336313337633434613339613231613930660a706172656e7420666264353662343964343030613139656531383561653733353431376264623334633038343632310a617574686f722057696c6c69616d2048696c746f6e203c776d68696c746f6e40676d61696c2e636f6d3e2031353038323034303133202d303430300a636f6d6d69747465722057696c6c69616d2048696c746f6e203c776d68696c746f6e40676d61696c2e636f6d3e2031353038323034303133202d303430300a0a696e646578206f6e206d61737465723a2066626435366234204164642027756e706b6727206b657920746f207061636b6167652e6a736f6e0a"`
      // );
      await fs.promises.rename(path.join(objectsPath, 'TEST'), path.join(objectsPath, firstCommit.oid.substring(0, 2)));
    });
  });
  test.skip('makes a packfile', async () => {
    const packName = await gitTestUtils.getPackID(dataDir);
    const fixture = await fs.promises.readFile(
      path.join(objectsPath, 'pack', `pack-${packName}.pack`)
    );
    // await fs.promises.unlink(path.join(objectsPath, 'pack', `pack-${packName}.pack`));
    const pack = await gitUtils.packObjects({
      fs: fs,
      gitdir: path.join(dataDir, '.git'),
      refs: commits.map((commit) => commit.oid),
    });
    for await (const data of pack.packstream) {
      console.log(data);
    }
    // expect(fixture.buffer).toEqual(packfile.buffer)
    // expect(
    //   Buffer.compare(Buffer.from(fixture), Buffer.from(packfile)) === 0
    // ).toBe(true)
  })
});
