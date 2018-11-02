# JavaScript Demo

This is an example JavaScript project using Nix to setup a development environment.

We're investigating the usage of `node2nix` for transforming a package.json into a package that we can use. The problem is whether we can still use the nix-shell and use npm normally from that point onwards.

We use `rollup` to build libraries, but `webpack` for building applications. But that's not really necessary, since `rollup` can be used for libraries too. What if you have both library and application?


```
# this will automatically run in the background for this directory
# we will set this up in the shell.nix
flow server &
flow stop
```

Run tests:

```
npm test
```

We want to add `node_modules/.bin` to our PATH as well.

Now we have `babel-node`, which we can use as a simple REPL to run scripts, because it requires babel compilation first.

---

```
# development is only needed for deving of shell.nix
# but during production we need not it... but you still need it to run any kind of babel compilation
# so you still need the develoment aspect of it to actually perform a build
# you have to specify the version as well

node2nix -8 --input ./package.json --output registry.nix --composition default.nix --node-env node-env.nix --development
```

If we give it a `node.nix` as composition, and use that in our own default.nix, do we also commit everything in the registry.nix? With regards to the development. We end up with 2 sources of truth, as this is basically building everything as a single thing. Every time you enter the shell, you have to run it again, which contacts the entire environment to build it again. It appears you'd want the `default.nix` to be generated, or built directly.

Because the distribution is also just installed. The default.nix doesn't actually all the dependencies of development. Only when you need to run with it in nix-shell. But then you would need to generate 2 registries. Secondly because we are releasing 2 distributions, what does it mean anyway?



---

Front end experiments with react, styled components and d3 and webpack (instead of rollup since this is for applications), not libraries.

So all react packages should use the same version. So we are using 16.2.0 basically.

We now need to run the react to actually compile out the code into a client side application. How do we do this without create-react-app?

So since we using webpack, instead of the rollup plugins, we need webpack plugins, one of them is called the `babel-loader`, which apparently webpack uses to load our files together. But we also seem to get the `babel-core` which I'm not sure why we need. The `babel-cli` already brings in `babel-core` I believe. If you want the CLI as well, you just pick `babel-cli` no need for the core. We can use `babel-polyfill` for the app (unlike `babel-runtime` for libraries).

To use `webpack.config.babel.js` you need `babel-register`. It's also true that ava requires `babel-register` as well so it's a pretty good test suite.

Once we have finished creating the webpack bundle. It is in the `public` directory. But this is not the proper build directory. In fact every time you build, you get a new webpack thing. In that case we can add and commit it, just like a library, but it's a big file. It is the compiled application. And then all we do is serve the file from a local web server. Which in this case points to public as a directory that is public.

Note that with SPA, cause you're JS has special routes, it needs to override how your URLs, so that the webserver doesn't see it. Usually this is done via hashbang routes, which doesn't affect the real webserver. But hashbang routes are ugly and so we have normal URLs. But with normal URLs, the main issue is that on first request, one has to hit http://website/thing where thing is a front end route. That means the webserver delivers the index.html, while it then interprets what thing is, and paints the site. (Alternatively there's isomorphic react apps which delivers the website/thing fully formed, but this is unnecessary in most cases). So this is what the local webserver needs to realise as well.

Note that this does not have autoreload unfortunately lol. You need something else to autoreload your web server now. But if you make changes to HTML, you just have to autoreload.

Anyway for now this works. We run `npm run build` and also `npm run serve`. And we just refresh the browser. Done.

Our script is loaded explicitly unlike create-react-app, not sure how it injects things into it.

Now that we have a simple hello world ready, we want create some exxtra components and perform routing over it. So `react-router` basically.

Turns out that react preset doesn't bring in object spread nor class properties. So we bring them in independently. Also flow is in explicitly anyway regardless of react bringing in flow because in the future react may not have flow, but I know I want flow here.

Another repository may then incorporate react-native and electron components and bring these together.

---

One issue is that users of this will need dos2unix.

---

# Polykey (library)

Polykey as a JS library. The `Polykey` is the actual application.

This is just the core library.

Alternatively we could call this `js-libpolykey`.

---

This blog post explains how to use encrypted tar archives.

https://blog.sourced.tech/post/siva/

We also need the PGP library to deal with this.

PGP Implementation:

* https://github.com/openpgpjs/openpgpjs
* https://github.com/keybase/kbpgp

---

We need to test isomorphic git usage with virtualfs.

Then we need to test the creation of tar archives and unpacking them, and also being able to access them.

Wait we don't need random access to tar archives, if we are unpacking into memory. Because it's not a tar of encrypted, it's encrypted tar.

An encrypted tar archive represents a sort of virtual directory of secrets. It is na indexed tar archive to allow random access. Oh wait.. you need indexed on the outside. Because it's 1 encrypted tar archive that contains all subsecrets, which are also encrypted. The top level is the polykey's master key. Subsequently each encrypted tar archive also has their own key. It's both encrypted with master key, and the keys of other users. Remember you tag with hardlinks as well. So hardlinks are kept in the tar repository.

Git is used on each secret archive. So version history is maintained automatically. What's inside a secret archive? It's always a set of files plus contents. The contents of each file can follow a schema. We have a schema set up in another directory called JSON schemas.

A secret repo can contain multiple secrets. But a secret repo is always shared as a single unit. A secret repo is given a name. It represents a unit of sharing. Within that name, there is a flat list of secrets? But wait, it's a directory. It can be hierarchal, it doesn't need to be flat.

Each Polykey node must maintain public keys of other people that you want to share with. Then we encrypt things with the shared public key. So that the archive is always shareable.

Wait... what is the point of encrypting, if we share the repo with their public key? Because you have decrypt it, unpack the tar archive in memory to VFS. And then it's a git repo. Then you share the secrets? In this sense, it is not shared with their public key. Well.... are we sharing the history of encryption? Does that mean the history isn't kept

```
share/
  72F28C3C7E70B2C48ABBE4A760C1FBE8E6B85B80/secret_repo.tar
```

If there's a share. We are saying that there's a pubkey. It maintains a hardlink?

Well it contains a link to a secret repository. This shows us the repos that are shared with a particular pubkey.

I have a problem with git and encryption and tar.

If we have encrypted secret repos. Which means repos themselves are tar archives that are encrypted. Public key sharing means these are encrypted with the master key and the shared public key.

If you want to "share" this to someone else. They have to pull it from you. Or you can push to them. But we want to allow push/pull by sets. Not by an entire repository.

So we have decrypt the tar archive, and unpack it into VFS. Then we can expose the git repo for sharing. Another polykey can pull it down into their git repo. Alternatively we use git-bundle.

But at no point is the shared public key being used here. You already decrypted it. If you want to ensure this makes sense. The other user must have the ability to decrypt the secrets. That means you cannot decrypt using master key. Instead you allow them to pull down the entire encrypted repository. They then need to decrypt it using their own secret key, unpack it into memory, and merge it into their own secret repo. At no point are we making use of the git commit log as a away to share commits to the secrets, which is a waste. Since we are only making use of git as version control, but not as version sharing.

Another thing is that do we allow any polykey to pull it down? Well to "share" something, we must have their pubkey. So there needs to be pubkey exchange. And then you encrypt it. You can send it to them, or open up to be pulled. How do we know whether the other user has the pubkey? They can present it. But we don't know if they own the corresponding secret key. Unless they send us a message that only our public key can be used to decrypt.

I can encrypt a token using their claimed public key. Send it to them. They need to decrypt the token with their secret key, and send back the message. If I get the message being that it's the same as the encrypted key. Then this handshake is complete. I trust that they are the legitimate owner of the public key. Maybe that could work. Another way is "verify ownership of public key". Only then do I supply access to my shared secret repos on that public key.

`git-bundle`... it is possible to bundle up something to be shared... but only up to the version history that they have. The user must specify a basis for the bundle before sending it. The receiver must then assume all objects in the basis are already there.

---

The alternative is to instead encrypt each of the secret files within a secret repository. The problem with doing this is that every secret is just a binary file, and we can no longer get proper version history, which defeats the point of using git. At least it may be possible to get what we want using encrypted tars of git repositories. Although the top level repo maintain history on changes to the encrypted repo, it knows nothing about the internals.

Wait shouldn't we have a spec on the secret repo? Not sure... maybe they should be free form. It's not up to polykey to decide what kind of secrets you have. You may have big secrets, or strange secrets. It's just how it is. You decide what you store there, and what you expect from there. But we can supply schemas later, and describe what it is... A filesystem type protocol? A json spec can specify JSON, but only for 1 file.

---

Ok we use git bundles for sharing for now.

keynode repo contains a list of key repos

A keynode repo is stored as a encrypted tar archive.

Each key repo is also stored a an encrypted tar archive. The inside of each is free form.

A key repo can be shared independently with others. It is determined by public keys for which we can share with.

Wait if we decrypt the top level keynode repo, there's no need for random access, because it's decrypted into memory.

Ok...

A Polykey node is a single node of Polykey.

A keys repo is a tar archive.

That tar archive contains encrypted tar archives also known as secret repos.

The keys repo itself is not encrypted and so allows random access. It's an indexed tar archive. If it were encrypted, we could not have random access. It's just then that the names of secrets are not hidden. That's unfortunate, but you have to rely on OS security for that. Unless of course you could encrypt a tar archive index, and only decrypt the ones you want. Or decrypt the index itself. And have encrypted names, or whatever.

For now let's just try that. Ok let's get a tar archive ready then.

Tars can be concatenated. However it's not widely supported. It allows you to do `EOF` padding in between tar archives. You just ignore zeroed blocks that are used as EOF markers.

There is a separate file indexer called `tarindexer`. We can embed theindex in the tar file itself.

The `tarindexer` creates a separate file called `indexfile.index`.

The `rat` is random access tar. Any tar file produced by `rat` is compatible with standard tar implementation.

To convert a tar file to a rat file. We need to:

```
src, _ := os.Open("standard.tar")_
dst, _ := os.Create("extended.tar")

defer src.Close()
defer dst.Close()

if err = AddIndexToTar(src, dst); err != nil {
  panic(err)
}

archive, _ := os.Open("extended.tar")_

content,_ := archive.ReadFile("foo.txt")
```

Ok so we need our own tar system to do this.

Wait somehow `os.Open` is returning `archive`, and that somehow has the ability to do `ReadFile`. How does that work?

Does it overload the `os`?

There's a function:

```
func AddIndexToTar(src, dst) {

}
```

The standard tar ignores data after the EOF mark. I actually don't need concatenation. So I don't need to worry about that. However this means if something else produced the tar, we would need to recreate that index. I think that is possible. We just need to detect whether that index exists or not. Alternatively we can use the zip format. Since we don't need concatenation. But zip would not be really part of unix formats. Tar maintains permissions.

Ok let's get node tar. And let's also get this into JS: https://github.com/mcuadros/go-rat it's pretty simple.

https://github.com/npm/node-tar

Unfortunately it expects fs. And I think unpacking may be complicated.

Look at the tar function. Study the creation function and the extract function. Then replicate it into vfs.

The `tar` library returns `tar.Unpack` object. It is "writable stream" that unpacks a tar archive into the filesystem. This stream based system API is really strange.

Ok so it's async, and nothing is consuming the stream, so there's no need to get it. If you provide it with just options, it will return a Promise. But if you provide it with a string, it just returns the Unpack object. Strange API. Ok can we use this?

We have to integrate the indexer into it. So either we fork this it. Or monkey patch it. Or something... I'm not sure. I think it might be better to write a simple tar reader and writer that works against an in-memory fs. First to understand the tar format however.

We read the extraction function and the creation function.

---

The RAT archive has declaration of a Var:

```
var (
  IndexSignature = []byte{'R', 'A', 'T'}
  UnsupportedIndex = errors.New("Unsupported tar file")
  UnableToSerializeIndexEntry = errors.New("Unable...")
)
```

It seems that's a way to declare multiple variables.

It defines variables in bulk, so you don't need to write it all the same time.

The most important part is the `IndexSignature`. Which is a byte string of `RAT`.

It gets used in:

```
func (i *index) WriteTo(w io.Writer) error {
  tail := bytes.NewBuffer(IndexSignature)
  if err := binary.Write(tail, binary.LittleEndian, IndexVersion); err != nil {
    // ...
  }
}
```

So there we go, it is turned into a `NewBuffer`. Not sure why that's needed. It creates and initialises a new Buffer using `buf` as the initial contents. So `* Buffer` means heap allocation, whereas the original buf is just a pointer. The `* Buffer` takes ownership. Wait... apparently the caller should not use buf after this call. It's used to prepare a Buffer to read existing data. So it seems that this is not being used correctly then. I thought it would mean heap allocation.

Also then `binary.Write`. What does this do?

```
type index struct {
  Entries map[string]*indexEntry
}
```

So this says that we have `index` is a struct, with 1 property. It's `indexEntry`.

The `map[string]*indexEntry` means `map[KeyType]ValueType`.

So here we have `Entries` that is a map from string to pointer to `indexEntry`.

Ok so we have a struct with `Entries` as its only property. Which is a map of string keys to pointers to `indexEntry`.

An `indexEntry` is:

```
type indexEntry struct {
  Name string
  Typeflag byte
  Header int64
  Start, End int64
}
```

It's in the same file, defined slightly lower.

We havea smart constructor:

```
// we are creating a pointer to index
// so it's heap allocation
func NewIndex() *index {
  // returns a pointer to an index construction
  // we don't need to name it explicitly
  // there's only 1 entry in the struct
  return &index{make(map[string]*indexEntry, 0)}
}
```

How does `make` work? It builds an empty map. The `make` if given no parameters other than the map type. Weird, I'm not sure if that's an actual parameter of it types are values in go. What's with the 0? The 0 means size. The first argument is a type, nota value. The make's return type is the same type as argument, not pointer to it. In the case of making maps, the second integer just means starting size. Apparently the size can be omitted. We can imagine it to be just an empty index with empty Entries!

The index has a method. That's called `WriteTo`. It takes a writer. This function basically takes a writer and writes the index to it.

```
func (i *index) WriteTo(w io.Writer) error {

  // tail is a new buffer with the size of IndexSignature
  // or it is buffer initialised with IndexSignature contents
  // not sure
  tail := bytes.NewBuffer(IndexSignature)
  // this writes to the tail buffer
  // in little endian order
  // the IndexVersion which is an int64
  if err := binary.Write(tail, binary.LittleEndian, IndexVersion); err != nil {
    return err
  }

  // iterate over each entry in the map
  // because it is a map
  // the iteration gives both key and value
  // here we discard the key
  // and then we use the WriteTo function
  // of each entry which is indexEntry type
  // and remember it's a pointer to indexEntry
  // but that works too
  // and we can call WriteTo
  // we write to the tail
  // which is an arbitrary sized buffer
  for _, e := range i.Entries {
    if err := e.WriteTo(tail); err != nil {
      return err
    }
  }

  // here we take our tail, and stream copy it into the w
  // the w which was passed into the WriteTo
  // each method is writing itself to some Writer
  // but it's actually a io.Writer which is an interface
  // so that's the type constraint

  // returns the length that waas written
  length, err := io.Copy(w, tail)
  if err != nil {
    return err
  }

   // so we still write the length which is already int64
   // at the very end again!
   // why do we write the length of what we wrote to it?
  if err := binary.Write(w, binary.LittleEndian, int64(length)); err != nil {
    return err
  }

}
```

The `indexEntry` byte representation has the following format:

```
3 byte index signature
x-byte index entries
8 byte length
```

I think what we have is a binary buffer that is incrementally getting written to. But the buffer appears to have arbitrary size.

First we initialise it with `RAT`. Then we write the `int64` in little endian format.

That means we have `IndexSignature` then `IndexVersion`.

Afterwhich we write each entry. Then after that we write the length number.

The whole thing is copied into the `w`.

Why do we have 3 bytes index signature, 8 bytes index version, then entries and then 8 byte length. Remember 8 bytes for int64. Why do we need the length at the very end? Oh wait, because you can start reading from the end of the file, and you read the length, which tells you how long to read it for! Ah I see it now... because this index is put at the end of the tar file! So that's why we have length indexing at the end.

Still strange since we put the signature and version at the beginning of this. I guess it still makes sense somewhat. Usually these things are TLV. So you would have this signature at the very front. But in that case you are trying to detect a signature at the very end.

Afterwards we have `tailSizeLength = 8`.

Note that tar has posix format and gnu format.

A tar archive is a series of file objects. Each file object includes a 512 byte header. The file data is always written with its length rounded to a multiple of 512 bytes. The extra padding data is usually zeroed.

The end of the archive is 2 consecutive zero filled records (how is it 2 if it is all zeros?)

The file header is this (all info in the header is in ASCII):

```
0 - 100 - File name (so max length of name is 100 characters)
100 - 8 - File mode
108 - 8 - Owner Id
116 - 8 - Group Id
124 - 12 - File size in octal base
136 - 12 - Last modification time in unix time format octal format
148 - 8 - Checksum
156 - 1 - Link indicator
157 - 100 - Name of linked file

Link indicator:

0 - Normal file
1 - Hard link
2 - Symlink
```

Wait the above is the old format. It is the `Pre-POSIX.1-1998 v7` tar header.

Apparently modern tar writes in `UStar` format now.

The GNU tar supports ustar, pax, GNU and v7 formats. We have to be aware what format we are trying to support and then, write an index for each one if necessary. Although we should probably convert the formats to a standardised format that we expect.

The `UStar` format is now:

```
0  - 156 - Several fields same as old format( the old format 7 fields up to 156 bytes!?) - That is File name, file mode, owner id, group id, file size, mod time, checksum
156 - 1 - Type flag
157 - 100 Same as old format (name of the linked name)
257 - 6 - Ustar indicator
263 - 2 - Ustar version
265 - 32 - Owner username
297 - 32 - Owner group name
329 - 8 - Device major number
337 - 8 - Device minor number
345 - 155 - Filename prefix
```

Remember how the header is 512 bytes, yea, so this is being used up by the extended tar format!

Device numbering is bit werid, there's standard numbers for disks, and the minor numbers tell us which one it is. It's just a marker to the driver being used, and the number of the device being used. Both are now variable anyway. I wonder why the tar keeps these for the files. They seem rather irrelevant! It is possible to dynamically allocate these numbers. Tar archives can apparently store device files. Oh... so you can now tar up block and char files. How weird! I'm assuming that doens't work on the systems that don't have that device.

So that header is in front of every file. So really it's possible to have a tar archive with header blocks that are not ustar and blocks that are ustar. That's pretty weird.

The type can now be 0, 1, 2, 3, 4, 5, 6, 7, g, x, A-Z. So that now covers normal files, hardlinks, symlinks, character devices, block devcies, directories, FIFO, contiguous file, global extended header, x extended header with metadata for the next file.

```
struct posix_header
{                              /* byte offset */
  char name[100];               /*   0 */
  char mode[8];                 /* 100 */
  char uid[8];                  /* 108 */
  char gid[8];                  /* 116 */
  char size[12];                /* 124 */
  char mtime[12];               /* 136 */
  char chksum[8];               /* 148 */
  char typeflag;                /* 156 */
  char linkname[100];           /* 157 */
  char magic[6];                /* 257 */
  char version[2];              /* 263 */
  char uname[32];               /* 265 */
  char gname[32];               /* 297 */
  char devmajor[8];             /* 329 */
  char devminor[8];             /* 337 */
  char prefix[155];             /* 345 */
                                /* 500 */
};
```

---

We need to continue understanding the tar format, so we know how to modify the original tar codebase.

Shall we monkey patch it or fork it?

Ok so we sort of understand the stream. We will maintain a fork and hopefully be able to retrieve upstream changes into the system afterwards. But this fork will need to have the `fs` API changed to virtualfs.

And we want to integrate go-rat into it. So we can have indexed tar archive.

The top level commands are:

```
exports.c = exports.create = require('./lib/create.js')
exports.r = exports.replace = require('./lib/replace.js')
exports.t = exports.list = require('./lib/list.js')
exports.u = exports.update = require('./lib/update.js')
exports.x = exports.extract = require('./lib/extract.js')
```

And we also have some classes like:

```
exports.Pack = require('./lib/pack.js')
exports.Unpack = require('./lib/unpack.js')
exports.Parse = require('./lib/parse.js')
exports.ReadEntry = require('./lib/read-entry.js')
exports.WriteEntry = require('./lib/write-entry.js')
exports.Header = require('./lib/header.js')
exports.Pax = require('./lib/pax.js')
exports.types = require('./lib/types.js')
```

Note that we also have the issue of async vs sync. In-memory usage is usually mostly sync.

We are forking from 4.4.4 version. I wonder if new bugs or features will be added in the future.


```
create - creates a new archive

# ok so this is async
# can we use async await here?
tar.create(
  {
    gzip: true,
    file: 'tarball.tar.gz'
  },
  [
    'randomfile'
  ]
).then(what => {
  // this creates a tarball immediately onto the disk
  console.log('created?');
  console.log(what);
});
```

An async function declaration returns an AsyncFunction object. They are similar to generators.

Oh you can stream the creation of archives like this:

```
tar.create({gzip: true}, ['randomfile']).pipe(fs.createWriteStream('something.tgz'));
```

Of course it still reads the `randomfile` from the node FS.

Let's see if we can make it await.

You need an `async function` that uses `await`. Can the global context use await as well?

You need an `async` function to await it.

Because all of the Node tar API is asynchronous, if you wanted to make it synchronous, you would have to wrap it at the top level main. With a final async IIFE:

```
// this would have to be the very end
(async () => {
  await main();
  console.log('something after main()');
})();
```

So this is not really nice. The async API doesn't really work for in-memory work. We will need to convert it to synchronous to deal with in-memory work. And if we wanted it to be async. We would need to use threads. But node doesn't have threads, all ASYNC relies on IO. (and we bubble up the async IO upwards). Since we are doing all of this in-memory we are not getting the benefit of concurrency here anyway. And we are not waiting on anything. The only thing that would benefit is true parallelism, or coroutines where we are sharing the computation step by step. True computation would be web workers, but that would be too complicated to do for the simple task of creating and uncreating tar files. So instead, it would most likely be using coroutines, with coorperative multitasking by using things like `setTimeout` and `nextTick`. Coroutines using callbacks however would be very difficult. We want the ability to launch a task, and yield back to the scheduler to do something. We could do that with callbacks. With simple functions you can get a coroutine, if each function returns the next call along with the result.

```
function co (input) {
  let result = input + 1;
  return [result, function () {
    console.log(result);
    var result = result + 1;
    return [result, function () {
      var result = result + 1;
      return [result, null];
    }];
  }];
}
```

```
function returnthis () {
  let result = 1;
  return function () {
    return result;
  };
}
```

---

It is possible to acquire random-access with compression as long as the compression is compressed into an indexed stream of blocks. Apparently the xz format maintains this ability, but you need an encoder to maintain that. But for this ability to maintain randomaccess for tar, you still need the tar index. (Which is possible as well). In both cases it's no longer a tar, but a tar + compressor. However I still haven't found one that maintains encryption (and would be PGP).

Read this: https://en.wikipedia.org/wiki/Disk_encryption_theory

---

Need to also plan out how to share secret repositories with each other. Right now git pull and push may be ok, but later we want something that works a bit better. There's also the possibility of using. More P2P sharing systems. Like torrenting, but there needs to be a model of initiating the sending of secrets to someplace. And whether the sharing of secrets is mediated out of band or in-band. Right now an in-band forward replication is like git push. While an out-of-band replication is a git pull. Essentially you need a discovery system, but a discovery system that is secure. So you could piggyback off keybase as a discovery system to share secrets with others. Look at things like hypercore and keybase while you're working on this.

---

Ok so now we are going to build this...

We have made a bunch of experiments.

As a core library of Polykey, we need to think of the API that UI system will have.

So we need to have some function calls.

The main class should be `Polykey.js`.

This should expose things like:

* Create a secret bundle
* Delete a secret bundle (untag it)
* Tag a secret bundle (we are using a tag based system)
* Untag it... so we can use a tagging system for this

A secret bundle. Let's give it a better name? It's a filesystem. So we can create a "secret archive" or "secret bundle" or "secretfs". FS is too technical.

A symmetric API means you can delete a vault. But without a tag, you cannot refer to it. So really there's. So when you create a vault, it's always tagged. When you remove the last tag, it's deleted, via garbage collection. Tagging is idempotent. There's no need to.. do that.

But the concept of deleting a vault, means removing all tags from the vault.

Note that security in transit, security at rest. What about security at use. The security at use is also secure, as we only maintain a decrypted version in-memory. It does not do memory encryption though. It's possible to extend this later by using secure enclaves. The main thing is to be secure even when the program is idling, and the decryption only occurs to a trusted program. (Then it's that fault to maintain).

We need a pub/priv key pair generated automatically. If this is not passed as a constructor, we will do autogeneration. And every new instance will have this. Note that each vault that is managed by a KeyNode is "encrypted" with the KeyNode pair always. So it is always tagged with the pubkey. But these tags could be untagged? That seems like it can be a problem, so we have to separate secure tags away from unsecured tags.

Suppose you have a key that is randomly generated when you create a new vault

A keynode has multiple vaults. Each vault has a corresponding vault key. This is hidden from end users. The vault key is encrypted with as many root public keys that the vault is meant to be shared with. You find other root public keys via external systems like Keybase acting as a social network for crypto-enthusiasts. But then you need to perform P2P discovery between keynodes to find the other keynode that is holding holding that root public key. The handshake here is important as we need to ensure that this prevents floods and DOS and ensure we don't scale bad actors. We don't want to leak information about whenever we are sharin/unsharing a vault with another user. So the vault key can be different in different keynodes.
