// @flow
/** @module Polykey */

class Polykey {

  constructor (keySystem): void {
    // how do we create pub/priv key pair?
    // do we use the same gpg pub/priv keypair

  }

  createVault () {

    // every vault is tagged with its own key

  }

  destroyVault () {

    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces is removed

  }

  tagVault () {

  }

  untagVault () {

  }

  shareVault () {

  }

  unshareVault () {

  }


}

export default Polykey;
