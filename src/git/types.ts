/**
 * A hash referring to a git object.
 * Has the format of a 40-digit hex number `40*(HEXDIGIT)`.
 */
type ObjectId = string;
/**
 * A reference is a branch name or path. There are special references such as `HEAD`.
 */
type Reference = string;

/**
 * An array of `ObjectID`s
 */
type ObjectIdList = Array<ObjectId>;
type Capability = string;
type CapabilityList = Array<Capability>;
const objectTypes = ['blob', 'tree', 'commit', 'tag'] as const;
/**
 * The git object type.
 * Commits point to a point in history.
 * Tags point to a commit.
 * Trees point to other objects forming the backbone of the graph.
 * Blobs are collections of data and file contents.
 */
type ObjectType = (typeof objectTypes)[number];
const requestTypes = ['want', 'have', 'SEPARATOR', 'done'] as const;
/**
 * The type of request line that was parsed.
 * Want refers to a objectId the
 */
type RequestType = (typeof requestTypes)[number];

export type {
  ObjectId,
  Reference,
  ObjectIdList,
  Capability,
  CapabilityList,
  ObjectType,
  RequestType,
};

export { objectTypes, requestTypes };
