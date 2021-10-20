// source: Secrets.proto
/**
 * @fileoverview
 * @enhanceable
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

var Vaults_pb = require('./Vaults_pb.js');
goog.object.extend(proto, Vaults_pb);
goog.exportSymbol('proto.secret.Directory', null, global);
goog.exportSymbol('proto.secret.Rename', null, global);
goog.exportSymbol('proto.secret.Secret', null, global);
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
proto.secret.Rename = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.secret.Rename, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.secret.Rename.displayName = 'proto.secret.Rename';
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
proto.secret.Secret = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.secret.Secret, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.secret.Secret.displayName = 'proto.secret.Secret';
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
proto.secret.Directory = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.secret.Directory, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.secret.Directory.displayName = 'proto.secret.Directory';
}



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
proto.secret.Rename.prototype.toObject = function(opt_includeInstance) {
  return proto.secret.Rename.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.secret.Rename} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.secret.Rename.toObject = function(includeInstance, msg) {
  var f, obj = {
    oldSecret: (f = msg.getOldSecret()) && proto.secret.Secret.toObject(includeInstance, f),
    newName: jspb.Message.getFieldWithDefault(msg, 2, "")
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
 * @return {!proto.secret.Rename}
 */
proto.secret.Rename.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.secret.Rename;
  return proto.secret.Rename.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.secret.Rename} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.secret.Rename}
 */
proto.secret.Rename.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.secret.Secret;
      reader.readMessage(value,proto.secret.Secret.deserializeBinaryFromReader);
      msg.setOldSecret(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewName(value);
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
proto.secret.Rename.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.secret.Rename.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.secret.Rename} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.secret.Rename.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOldSecret();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.secret.Secret.serializeBinaryToWriter
    );
  }
  f = message.getNewName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional Secret old_secret = 1;
 * @return {?proto.secret.Secret}
 */
proto.secret.Rename.prototype.getOldSecret = function() {
  return /** @type{?proto.secret.Secret} */ (
    jspb.Message.getWrapperField(this, proto.secret.Secret, 1));
};


/**
 * @param {?proto.secret.Secret|undefined} value
 * @return {!proto.secret.Rename} returns this
*/
proto.secret.Rename.prototype.setOldSecret = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.secret.Rename} returns this
 */
proto.secret.Rename.prototype.clearOldSecret = function() {
  return this.setOldSecret(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.secret.Rename.prototype.hasOldSecret = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional string new_name = 2;
 * @return {string}
 */
proto.secret.Rename.prototype.getNewName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.secret.Rename} returns this
 */
proto.secret.Rename.prototype.setNewName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
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
proto.secret.Secret.prototype.toObject = function(opt_includeInstance) {
  return proto.secret.Secret.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.secret.Secret} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.secret.Secret.toObject = function(includeInstance, msg) {
  var f, obj = {
    vault: (f = msg.getVault()) && Vaults_pb.Vault.toObject(includeInstance, f),
    secretName: jspb.Message.getFieldWithDefault(msg, 2, ""),
    secretContent: msg.getSecretContent_asB64()
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
 * @return {!proto.secret.Secret}
 */
proto.secret.Secret.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.secret.Secret;
  return proto.secret.Secret.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.secret.Secret} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.secret.Secret}
 */
proto.secret.Secret.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new Vaults_pb.Vault;
      reader.readMessage(value,Vaults_pb.Vault.deserializeBinaryFromReader);
      msg.setVault(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSecretName(value);
      break;
    case 3:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setSecretContent(value);
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
proto.secret.Secret.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.secret.Secret.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.secret.Secret} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.secret.Secret.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getVault();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      Vaults_pb.Vault.serializeBinaryToWriter
    );
  }
  f = message.getSecretName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getSecretContent_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      3,
      f
    );
  }
};


/**
 * optional Vault.Vault vault = 1;
 * @return {?proto.Vault.Vault}
 */
proto.secret.Secret.prototype.getVault = function() {
  return /** @type{?proto.Vault.Vault} */ (
    jspb.Message.getWrapperField(this, Vaults_pb.Vault, 1));
};


/**
 * @param {?proto.Vault.Vault|undefined} value
 * @return {!proto.secret.Secret} returns this
*/
proto.secret.Secret.prototype.setVault = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.secret.Secret} returns this
 */
proto.secret.Secret.prototype.clearVault = function() {
  return this.setVault(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.secret.Secret.prototype.hasVault = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional string secret_name = 2;
 * @return {string}
 */
proto.secret.Secret.prototype.getSecretName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.secret.Secret} returns this
 */
proto.secret.Secret.prototype.setSecretName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional bytes secret_content = 3;
 * @return {!(string|Uint8Array)}
 */
proto.secret.Secret.prototype.getSecretContent = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * optional bytes secret_content = 3;
 * This is a type-conversion wrapper around `getSecretContent()`
 * @return {string}
 */
proto.secret.Secret.prototype.getSecretContent_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getSecretContent()));
};


/**
 * optional bytes secret_content = 3;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getSecretContent()`
 * @return {!Uint8Array}
 */
proto.secret.Secret.prototype.getSecretContent_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getSecretContent()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.secret.Secret} returns this
 */
proto.secret.Secret.prototype.setSecretContent = function(value) {
  return jspb.Message.setProto3BytesField(this, 3, value);
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
proto.secret.Directory.prototype.toObject = function(opt_includeInstance) {
  return proto.secret.Directory.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.secret.Directory} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.secret.Directory.toObject = function(includeInstance, msg) {
  var f, obj = {
    vault: (f = msg.getVault()) && Vaults_pb.Vault.toObject(includeInstance, f),
    secretDirectory: jspb.Message.getFieldWithDefault(msg, 2, "")
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
 * @return {!proto.secret.Directory}
 */
proto.secret.Directory.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.secret.Directory;
  return proto.secret.Directory.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.secret.Directory} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.secret.Directory}
 */
proto.secret.Directory.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new Vaults_pb.Vault;
      reader.readMessage(value,Vaults_pb.Vault.deserializeBinaryFromReader);
      msg.setVault(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSecretDirectory(value);
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
proto.secret.Directory.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.secret.Directory.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.secret.Directory} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.secret.Directory.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getVault();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      Vaults_pb.Vault.serializeBinaryToWriter
    );
  }
  f = message.getSecretDirectory();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional Vault.Vault vault = 1;
 * @return {?proto.Vault.Vault}
 */
proto.secret.Directory.prototype.getVault = function() {
  return /** @type{?proto.Vault.Vault} */ (
    jspb.Message.getWrapperField(this, Vaults_pb.Vault, 1));
};


/**
 * @param {?proto.Vault.Vault|undefined} value
 * @return {!proto.secret.Directory} returns this
*/
proto.secret.Directory.prototype.setVault = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.secret.Directory} returns this
 */
proto.secret.Directory.prototype.clearVault = function() {
  return this.setVault(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.secret.Directory.prototype.hasVault = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional string secret_directory = 2;
 * @return {string}
 */
proto.secret.Directory.prototype.getSecretDirectory = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.secret.Directory} returns this
 */
proto.secret.Directory.prototype.setSecretDirectory = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


goog.object.extend(exports, proto.secret);
