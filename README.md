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
