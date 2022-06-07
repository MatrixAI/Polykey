// source: polykey/v1/permissions/permissions.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} reports error on implicit type usages.
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var polykey_v1_nodes_nodes_pb = require('../../../polykey/v1/nodes/nodes_pb.js');
goog.object.extend(proto, polykey_v1_nodes_nodes_pb);
var polykey_v1_identities_identities_pb = require('../../../polykey/v1/identities/identities_pb.js');
goog.object.extend(proto, polykey_v1_identities_identities_pb);
goog.exportSymbol('proto.polykey.v1.permissions.ActionSet', null, global);
goog.exportSymbol('proto.polykey.v1.permissions.ActionSet.NodeOrProviderCase', null, global);
goog.exportSymbol('proto.polykey.v1.permissions.Actions', null, global);
goog.exportSymbol('proto.polykey.v1.permissions.NodeActions', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.polykey.v1.permissions.Actions = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.polykey.v1.permissions.Actions.repeatedFields_, null);
};
goog.inherits(proto.polykey.v1.permissions.Actions, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.polykey.v1.permissions.Actions.displayName = 'proto.polykey.v1.permissions.Actions';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.polykey.v1.permissions.NodeActions = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.polykey.v1.permissions.NodeActions.repeatedFields_, null);
};
goog.inherits(proto.polykey.v1.permissions.NodeActions, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.polykey.v1.permissions.NodeActions.displayName = 'proto.polykey.v1.permissions.NodeActions';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.polykey.v1.permissions.ActionSet = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.polykey.v1.permissions.ActionSet.oneofGroups_);
};
goog.inherits(proto.polykey.v1.permissions.ActionSet, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.polykey.v1.permissions.ActionSet.displayName = 'proto.polykey.v1.permissions.ActionSet';
}

/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.polykey.v1.permissions.Actions.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.polykey.v1.permissions.Actions.prototype.toObject = function(opt_includeInstance) {
  return proto.polykey.v1.permissions.Actions.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.polykey.v1.permissions.Actions} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.polykey.v1.permissions.Actions.toObject = function(includeInstance, msg) {
  var f, obj = {
    actionList: (f = jspb.Message.getRepeatedField(msg, 1)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.polykey.v1.permissions.Actions}
 */
proto.polykey.v1.permissions.Actions.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.polykey.v1.permissions.Actions;
  return proto.polykey.v1.permissions.Actions.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.polykey.v1.permissions.Actions} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.polykey.v1.permissions.Actions}
 */
proto.polykey.v1.permissions.Actions.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addAction(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.polykey.v1.permissions.Actions.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.polykey.v1.permissions.Actions.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.polykey.v1.permissions.Actions} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.polykey.v1.permissions.Actions.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getActionList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
};


/**
 * repeated string action = 1;
 * @return {!Array<string>}
 */
proto.polykey.v1.permissions.Actions.prototype.getActionList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 1));
};


/**
 * @param {!Array<string>} value
 * @return {!proto.polykey.v1.permissions.Actions} returns this
 */
proto.polykey.v1.permissions.Actions.prototype.setActionList = function(value) {
  return jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.polykey.v1.permissions.Actions} returns this
 */
proto.polykey.v1.permissions.Actions.prototype.addAction = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.polykey.v1.permissions.Actions} returns this
 */
proto.polykey.v1.permissions.Actions.prototype.clearActionList = function() {
  return this.setActionList([]);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.polykey.v1.permissions.NodeActions.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.polykey.v1.permissions.NodeActions.prototype.toObject = function(opt_includeInstance) {
  return proto.polykey.v1.permissions.NodeActions.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.polykey.v1.permissions.NodeActions} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.polykey.v1.permissions.NodeActions.toObject = function(includeInstance, msg) {
  var f, obj = {
    node: (f = msg.getNode()) && polykey_v1_nodes_nodes_pb.Node.toObject(includeInstance, f),
    actionsList: (f = jspb.Message.getRepeatedField(msg, 2)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.polykey.v1.permissions.NodeActions}
 */
proto.polykey.v1.permissions.NodeActions.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.polykey.v1.permissions.NodeActions;
  return proto.polykey.v1.permissions.NodeActions.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.polykey.v1.permissions.NodeActions} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.polykey.v1.permissions.NodeActions}
 */
proto.polykey.v1.permissions.NodeActions.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new polykey_v1_nodes_nodes_pb.Node;
      reader.readMessage(value,polykey_v1_nodes_nodes_pb.Node.deserializeBinaryFromReader);
      msg.setNode(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.addActions(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.polykey.v1.permissions.NodeActions.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.polykey.v1.permissions.NodeActions.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.polykey.v1.permissions.NodeActions} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.polykey.v1.permissions.NodeActions.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNode();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      polykey_v1_nodes_nodes_pb.Node.serializeBinaryToWriter
    );
  }
  f = message.getActionsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      2,
      f
    );
  }
};


/**
 * optional polykey.v1.nodes.Node node = 1;
 * @return {?proto.polykey.v1.nodes.Node}
 */
proto.polykey.v1.permissions.NodeActions.prototype.getNode = function() {
  return /** @type{?proto.polykey.v1.nodes.Node} */ (
    jspb.Message.getWrapperField(this, polykey_v1_nodes_nodes_pb.Node, 1));
};


/**
 * @param {?proto.polykey.v1.nodes.Node|undefined} value
 * @return {!proto.polykey.v1.permissions.NodeActions} returns this
*/
proto.polykey.v1.permissions.NodeActions.prototype.setNode = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.polykey.v1.permissions.NodeActions} returns this
 */
proto.polykey.v1.permissions.NodeActions.prototype.clearNode = function() {
  return this.setNode(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.polykey.v1.permissions.NodeActions.prototype.hasNode = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * repeated string actions = 2;
 * @return {!Array<string>}
 */
proto.polykey.v1.permissions.NodeActions.prototype.getActionsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 2));
};


/**
 * @param {!Array<string>} value
 * @return {!proto.polykey.v1.permissions.NodeActions} returns this
 */
proto.polykey.v1.permissions.NodeActions.prototype.setActionsList = function(value) {
  return jspb.Message.setField(this, 2, value || []);
};


/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.polykey.v1.permissions.NodeActions} returns this
 */
proto.polykey.v1.permissions.NodeActions.prototype.addActions = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 2, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.polykey.v1.permissions.NodeActions} returns this
 */
proto.polykey.v1.permissions.NodeActions.prototype.clearActionsList = function() {
  return this.setActionsList([]);
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.polykey.v1.permissions.ActionSet.oneofGroups_ = [[1,2]];

/**
 * @enum {number}
 */
proto.polykey.v1.permissions.ActionSet.NodeOrProviderCase = {
  NODE_OR_PROVIDER_NOT_SET: 0,
  NODE: 1,
  IDENTITY: 2
};

/**
 * @return {proto.polykey.v1.permissions.ActionSet.NodeOrProviderCase}
 */
proto.polykey.v1.permissions.ActionSet.prototype.getNodeOrProviderCase = function() {
  return /** @type {proto.polykey.v1.permissions.ActionSet.NodeOrProviderCase} */(jspb.Message.computeOneofCase(this, proto.polykey.v1.permissions.ActionSet.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.polykey.v1.permissions.ActionSet.prototype.toObject = function(opt_includeInstance) {
  return proto.polykey.v1.permissions.ActionSet.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.polykey.v1.permissions.ActionSet} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.polykey.v1.permissions.ActionSet.toObject = function(includeInstance, msg) {
  var f, obj = {
    node: (f = msg.getNode()) && polykey_v1_nodes_nodes_pb.Node.toObject(includeInstance, f),
    identity: (f = msg.getIdentity()) && polykey_v1_identities_identities_pb.Provider.toObject(includeInstance, f),
    action: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.polykey.v1.permissions.ActionSet}
 */
proto.polykey.v1.permissions.ActionSet.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.polykey.v1.permissions.ActionSet;
  return proto.polykey.v1.permissions.ActionSet.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.polykey.v1.permissions.ActionSet} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.polykey.v1.permissions.ActionSet}
 */
proto.polykey.v1.permissions.ActionSet.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new polykey_v1_nodes_nodes_pb.Node;
      reader.readMessage(value,polykey_v1_nodes_nodes_pb.Node.deserializeBinaryFromReader);
      msg.setNode(value);
      break;
    case 2:
      var value = new polykey_v1_identities_identities_pb.Provider;
      reader.readMessage(value,polykey_v1_identities_identities_pb.Provider.deserializeBinaryFromReader);
      msg.setIdentity(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setAction(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.polykey.v1.permissions.ActionSet.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.polykey.v1.permissions.ActionSet.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.polykey.v1.permissions.ActionSet} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.polykey.v1.permissions.ActionSet.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNode();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      polykey_v1_nodes_nodes_pb.Node.serializeBinaryToWriter
    );
  }
  f = message.getIdentity();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      polykey_v1_identities_identities_pb.Provider.serializeBinaryToWriter
    );
  }
  f = message.getAction();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional polykey.v1.nodes.Node node = 1;
 * @return {?proto.polykey.v1.nodes.Node}
 */
proto.polykey.v1.permissions.ActionSet.prototype.getNode = function() {
  return /** @type{?proto.polykey.v1.nodes.Node} */ (
    jspb.Message.getWrapperField(this, polykey_v1_nodes_nodes_pb.Node, 1));
};


/**
 * @param {?proto.polykey.v1.nodes.Node|undefined} value
 * @return {!proto.polykey.v1.permissions.ActionSet} returns this
*/
proto.polykey.v1.permissions.ActionSet.prototype.setNode = function(value) {
  return jspb.Message.setOneofWrapperField(this, 1, proto.polykey.v1.permissions.ActionSet.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.polykey.v1.permissions.ActionSet} returns this
 */
proto.polykey.v1.permissions.ActionSet.prototype.clearNode = function() {
  return this.setNode(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.polykey.v1.permissions.ActionSet.prototype.hasNode = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional polykey.v1.identities.Provider identity = 2;
 * @return {?proto.polykey.v1.identities.Provider}
 */
proto.polykey.v1.permissions.ActionSet.prototype.getIdentity = function() {
  return /** @type{?proto.polykey.v1.identities.Provider} */ (
    jspb.Message.getWrapperField(this, polykey_v1_identities_identities_pb.Provider, 2));
};


/**
 * @param {?proto.polykey.v1.identities.Provider|undefined} value
 * @return {!proto.polykey.v1.permissions.ActionSet} returns this
*/
proto.polykey.v1.permissions.ActionSet.prototype.setIdentity = function(value) {
  return jspb.Message.setOneofWrapperField(this, 2, proto.polykey.v1.permissions.ActionSet.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.polykey.v1.permissions.ActionSet} returns this
 */
proto.polykey.v1.permissions.ActionSet.prototype.clearIdentity = function() {
  return this.setIdentity(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.polykey.v1.permissions.ActionSet.prototype.hasIdentity = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional string action = 3;
 * @return {string}
 */
proto.polykey.v1.permissions.ActionSet.prototype.getAction = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * @param {string} value
 * @return {!proto.polykey.v1.permissions.ActionSet} returns this
 */
proto.polykey.v1.permissions.ActionSet.prototype.setAction = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};


goog.object.extend(exports, proto.polykey.v1.permissions);
