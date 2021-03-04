import { arrayEquals } from '../../utils';

// this is an adaptation of the awesome k-buckets library but with specific polykey use in mind:
// https://github.com/tristanls/k-bucket
// Background reading:
// https://docs.google.com/presentation/d/11qGZlPWu6vEAhA7p3qsQaQtWH7KofEC9dMeBFZ1gYeA/edit#slide=id.g1718cc2bc_0643

function createNode(): Node {
  return { contacts: [], dontSplit: false, left: null, right: null };
}

type Node = {
  contacts: Uint8Array[] | null;
  dontSplit: boolean;
  left: Node | null;
  right: Node | null;
};

/**
 * Implementation of a Kademlia DHT k-bucket used for storing
 * contact (node node) information.
 */
class KBucket {
  private getNodeId: () => string;

  private pingNode: (oldContacts: string[], newContact: string) => void;

  numberOfNodesPerKBucket: number;
  private numberOfNodesToPing: number;
  private root: Node;

  constructor(
    getNodeId: () => string,
    pingNode: (oldContacts: string[], newContact: string) => void,
  ) {
    this.getNodeId = getNodeId;
    this.pingNode = pingNode;

    // standard configuration
    this.numberOfNodesPerKBucket = 20;
    this.numberOfNodesToPing = 3;

    // create the root node
    this.root = createNode();
  }

  public get localNodeId(): Uint8Array {
    const id = this.getNodeId();
    return this.nodeIdToU8(id);
  }

  /**
   * Default arbiter function for contacts with the same id. Uses
   * contact.vectorClock to select which contact to update the k-bucket with.
   * Contact with larger vectorClock field will be selected. If vectorClock is
   * the same, candidate will be selected.
   *
   * @param  {Object} incumbent Contact currently stored in the k-bucket.
   * @param  {Object} candidate Contact being added to the k-bucket.
   * @return {Object}           Contact to updated the k-bucket with.
   */
  arbiter(incumbent: Uint8Array, candidate: Uint8Array): Uint8Array {
    // this would neeed to be calculated from some kind of vectorClock
    return candidate;
    // return incumbent.vectorClock > candidate.vectorClock ? incumbent : candidate
  }

  /**
   * Default distance function. Finds the XOR
   * distance between firstId and secondId.
   *
   * @param firstId  first id.
   * @param secondId second id.
   * @return Integer The XOR distance between firstId and secondId.
   */
  private distance(firstId: Uint8Array, secondId: Uint8Array): number {
    let distance = 0;
    let i = 0;
    const min = Math.min(firstId.length, secondId.length);
    const max = Math.max(firstId.length, secondId.length);
    for (; i < min; ++i) {
      distance = distance * 256 + (firstId[i] ^ secondId[i]);
    }
    for (; i < max; ++i) distance = distance * 256 + 255;
    return distance;
  }

  /**
   * Adds a contact to the k-bucket.
   *
   * @param contact the contact object to add
   */
  async add(nodeId: string): Promise<void> {
    const id = this.nodeIdToU8(nodeId);
    let bitIndex = 0;
    let node = this.root;

    while (node.contacts === null) {
      // this is not a leaf node but an inner node with 'low' and 'high'
      // branches; we will check the appropriate bit of the identifier and
      // delegate to the appropriate node for further processing
      const innerNode = this.determineNode(node, id, bitIndex++);
      if (innerNode) {
        node = innerNode;
      }
    }

    // check if the contact already exists
    const index = this.indexOf(node, id);
    if (index >= 0) {
      this.update(node, index, id);
      return;
    }

    if (node.contacts.length < this.numberOfNodesPerKBucket) {
      node.contacts.push(id);
      // this.emit('added', contact)
      return;
    }

    // the bucket is full
    if (node.dontSplit) {
      // we are not allowed to split the bucket
      // we need to ping the first this.numberOfNodesToPing
      // in order to determine if they are alive
      // only if one of the pinged nodes does not respond, can the new contact
      // be added (this prevents DoS flodding with new invalid contacts)
      this.pingNode(
        node.contacts
          .slice(0, this.numberOfNodesToPing)
          .map((i) => this.u8ToNodeId(i)),
        this.u8ToNodeId(id),
      );
      return;
    }

    this.split(node, bitIndex);
    return await this.add(this.u8ToNodeId(id));
  }

  /**
   * Get the n closest contacts to the provided node id. "Closest" here means:
   * closest according to the XOR metric of the contact node id.
   *
   * @param publicKey  Contact node id
   * @param num Integer (Default: Infinity) The maximum number of all closest contacts to return
   * @return Array Maximum of n closest public keys to the provided public key
   */
  closest(nodeId: string, num = Infinity): string[] {
    const idU8 = this.nodeIdToU8(nodeId);
    if ((!Number.isInteger(num) && num !== Infinity) || num <= 0) {
      throw new TypeError('n is not positive number');
    }

    let contacts: Uint8Array[] = [];

    for (
      let nodes = [this.root], bitIndex = 0;
      nodes.length > 0 && contacts.length < num;

    ) {
      const node = nodes.pop();

      if (node) {
        if (node.contacts === null) {
          const detNode = this.determineNode(node, idU8, bitIndex++);
          const nodeToBePushed = node.left === detNode ? node.right : node.left;
          if (nodeToBePushed) {
            nodes.push(nodeToBePushed);
          }
          if (detNode) {
            nodes.push(detNode);
          }
        } else {
          contacts = contacts.concat(node.contacts);
        }
      }
    }

    return contacts
      .map((a) => ({ distance: this.distance(a, idU8), node: a }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, num)
      .map((a) => this.u8ToNodeId(a.node));
  }

  /**
   * Counts the total number of contacts in the tree.
   *
   * @return {Number} The number of contacts held in the tree
   */
  count(): number {
    let count = 0;
    for (const nodes = [this.root]; nodes.length > 0; ) {
      const node = nodes.pop();
      if (node) {
        if (node.contacts === null) {
          nodes.push({
            contacts: [],
            right: node.right,
            left: node.left,
            dontSplit: true,
          });
        } else {
          count += node.contacts.length;
        }
      }
    }
    return count;
  }

  /**
   * Determines whether the id at the bitIndex is 0 or 1.
   * Return left leaf if `id` at `bitIndex` is 0, right leaf otherwise
   *
   * @param  {Object} node     internal object that has 2 leafs: left and right
   * @param  {Uint8Array} id   Id to compare localNodeId with.
   * @param  {Number} bitIndex Integer (Default: 0) The bit index to which bit
   *                           to check in the id Uint8Array.
   * @return {Object}          left leaf if id at bitIndex is 0, right leaf otherwise.
   */
  private determineNode(
    node: Node,
    id: Uint8Array,
    bitIndex: number,
  ): Node | null {
    // **NOTE** remember that id is a Uint8Array and has granularity of
    // bytes (8 bits), whereas the bitIndex is the _bit_ index (not byte)

    // id's that are too short are put in low bucket (1 byte = 8 bits)
    // (bitIndex >> 3) finds how many bytes the bitIndex describes
    // bitIndex % 8 checks if we have extra bits beyond byte multiples
    // if number of bytes is <= no. of bytes described by bitIndex and there
    // are extra bits to consider, this means id has less bits than what
    // bitIndex describes, id therefore is too short, and will be put in low
    // bucket
    const bytesDescribedByBitIndex = bitIndex >> 3;
    const bitIndexWithinByte = bitIndex % 8;
    if (id.length <= bytesDescribedByBitIndex && bitIndexWithinByte !== 0) {
      return node.left;
    }

    const byteUnderConsideration = id[bytesDescribedByBitIndex];

    // byteUnderConsideration is an integer from 0 to 255 represented by 8 bits
    // where 255 is 11111111 and 0 is 00000000
    // in order to find out whether the bit at bitIndexWithinByte is set
    // we construct (1 << (7 - bitIndexWithinByte)) which will consist
    // of all bits being 0, with only one bit set to 1
    // for example, if bitIndexWithinByte is 3, we will construct 00010000 by
    // (1 << (7 - 3)) -> (1 << 4) -> 16
    if (byteUnderConsideration & (1 << (7 - bitIndexWithinByte))) {
      return node.right;
    }

    return node.left;
  }

  /**
   * Get a contact by its exact ID.
   * If this is a leaf, loop through the bucket contents and return the correct
   * contact if we have it or null if not. If this is an inner node, determine
   * which branch of the tree to traverse and repeat.
   *
   * @param  {Uint8Array} id The ID of the contact to fetch.
   * @return {NodeInfo|Null}   The contact if available, otherwise null
   */
  get(id: Uint8Array): Uint8Array | null {
    let bitIndex = 0;

    let node = this.root;
    while (node.contacts === null) {
      const innerNode = this.determineNode(node, id, bitIndex++);
      if (innerNode) {
        node = innerNode;
      }
    }

    // index of uses contact id for matching
    const index = this.indexOf(node, id);
    return index >= 0 ? node.contacts[index] : null;
  }

  /**
   * Returns the index of the contact with provided
   * id if it exists, returns -1 otherwise.
   *
   * @param  {Object} node    internal object that has 2 leafs: left and right
   * @param  {Uint8Array} id  Contact node id.
   * @return {Number}         Integer Index of contact with provided id if it
   *                          exists, -1 otherwise.
   */
  private indexOf(node: Node, id: Uint8Array): number {
    if (node.contacts) {
      for (let i = 0; i < node.contacts.length; ++i) {
        const foundId = node.contacts[i];
        if (arrayEquals(foundId, id)) return i;
      }
    }

    return -1;
  }

  /**
   * Removes contact with the provided id.
   *
   * @param  {Uint8Array} id The ID of the contact to remove.
   * @return {Object}        The k-bucket itself.
   */
  remove(nodeId: string): KBucket {
    const idU8 = this.nodeIdToU8(nodeId);
    let bitIndex = 0;
    let node = this.root;

    while (node.contacts === null) {
      const innerNode = this.determineNode(node, idU8, bitIndex++);
      if (innerNode) {
        node = innerNode;
      }
    }

    // const index = this.indexOf(node, idU8);
    // if (index >= 0) {
    //   const contact = node.contacts.splice(index, 1)[0];
    //   // this.emit('removed', contact)
    // }

    return this;
  }

  /**
   * Splits the node, redistributes contacts to the new nodes, and marks the
   * node that was split as an inner node of the binary tree of nodes by
   * setting this.root.contacts = null
   *
   * @param  {Object} node     node for splitting
   * @param  {Number} bitIndex the bitIndex to which byte to check in the
   *                           Uint8Array for navigating the binary tree
   */
  private split(node: Node, bitIndex: number): void {
    node.left = createNode();
    node.right = createNode();

    // redistribute existing contacts amongst the two newly created nodes
    if (node.contacts) {
      for (const contact of node.contacts) {
        const innerNode = this.determineNode(node, contact, bitIndex);
        if (innerNode && innerNode.contacts) {
          innerNode.contacts.push(contact);
        }
      }
    }

    node.contacts = []; // mark as inner tree node

    // don't split the "far away" node
    // we check where the local node would end up and mark the other one as
    // "dontSplit" (i.e. "far away")
    const detNode = this.determineNode(node, this.localNodeId, bitIndex);
    const otherNode = node.left === detNode ? node.right : node.left;
    otherNode.dontSplit = true;
  }

  /**
   * Returns all the contacts contained in the tree as an array.
   * If this is a leaf, return a copy of the bucket. `slice` is used so that we
   * don't accidentally leak an internal reference out that might be
   * accidentally misused. If this is not a leaf, return the union of the low
   * and high branches (themselves also as arrays).
   *
   * @return {Array} All of the contacts in the tree, as an array
   */
  toArray(): string[] {
    let result: string[] = [];
    for (const nodes = [this.root]; nodes.length > 0; ) {
      const node = nodes.pop();
      if (node) {
        if (node.contacts === null) {
          if (node.right) {
            nodes.push(node.right);
          }
          if (node.left) {
            nodes.push(node.left);
          }
        } else {
          result = result.concat(node.contacts.map((i) => this.u8ToNodeId(i)));
        }
      }
    }
    return result;
  }

  /**
   * Updates the contact selected by the arbiter.
   * If the selection is our old contact and the candidate is some new contact
   * then the new contact is abandoned (not added).
   * If the selection is our old contact and the candidate is our old contact
   * then we are refreshing the contact and it is marked as most recently
   * contacted (by being moved to the right/end of the bucket array).
   * If the selection is our new contact, the old contact is removed and the new
   * contact is marked as most recently contacted.
   *
   * @param  {Object} node    internal object that has 2 leafs: left and right
   * @param  {Number} index   the index in the bucket where contact exists
   *                          (index has already been computed in a previous
   *                          calculation)
   * @param  {Object} contact The contact object to update.
   */
  private update(node: Node, index: number, contact: Uint8Array) {
    // sanity check
    if (node.contacts && !arrayEquals(node.contacts[index], contact)) {
      throw new Error('wrong index for update');
    }

    const incumbent = node.contacts![index];
    const selection = this.arbiter(incumbent, contact);
    // if the selection is our old contact and the candidate is some new
    // contact, then there is nothing to do
    if (selection === incumbent && incumbent !== contact) return;

    node.contacts!.splice(index, 1); // remove old contact
    node.contacts!.push(selection); // add more recent contact version
    // this.emit('updated', incumbent, selection)
  }

  // ==== Helper methods ==== //
  private nodeIdToU8(id: string) {
    const b = Buffer.from(id);
    return new Uint8Array(
      b.buffer,
      b.byteOffset,
      b.byteLength / Uint8Array.BYTES_PER_ELEMENT,
    );
  }

  private u8ToNodeId(ui8: Uint8Array) {
    return Buffer.from(ui8).toString();
  }
}

export default KBucket;
