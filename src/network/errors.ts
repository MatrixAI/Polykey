import type { JSONValue } from '../types';
import type { Class } from '@matrixai/errors';
import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorNetwork<T> extends ErrorPolykey<T> {}

/**
 * Used for certificate verification
 */
class ErrorCertChain<T> extends ErrorNetwork<T> {}

class ErrorCertChainEmpty<T> extends ErrorCertChain<T> {
  static description = 'Certificate chain is empty';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainUnclaimed<T> extends ErrorCertChain<T> {
  static description = 'The target node id is not claimed by any certificate';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainBroken<T> extends ErrorCertChain<T> {
  static description = 'The signature chain is broken';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainDateInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate in the chain is expired';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainNameInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate is missing the common name';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainKeyInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate public key does not generate the Node ID';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainSignatureInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate self-signed signature is invalid';
  exitCode = sysexits.PROTOCOL;
}

class ErrorDNSResolver<T> extends ErrorNetwork<T> {
  static description = 'DNS resolution failed';
  exitCode = sysexits.SOFTWARE;
}

class ErrorPolykeyRemote<T> extends ErrorPolykey<T> {
  static description = 'Remote error from RPC call';
  exitCode: number = sysexits.UNAVAILABLE;
  metadata: JSONValue | undefined;

  constructor(metadata?: JSONValue, message?: string, options?) {
    super(message, options);
    this.metadata = metadata;
  }

  public static fromJSON<T extends Class<any>>(
    this: T,
    json: any,
  ): InstanceType<T> {
    if (
      typeof json !== 'object' ||
      json.type !== this.name ||
      typeof json.data !== 'object' ||
      typeof json.data.message !== 'string' ||
      isNaN(Date.parse(json.data.timestamp)) ||
      typeof json.data.metadata !== 'object' ||
      typeof json.data.data !== 'object' ||
      typeof json.data.exitCode !== 'number' ||
      ('stack' in json.data && typeof json.data.stack !== 'string')
    ) {
      throw new TypeError(`Cannot decode JSON to ${this.name}`);
    }
    const e = new this(json.data.metadata, json.data.message, {
      timestamp: new Date(json.data.timestamp),
      data: json.data.data,
      cause: json.data.cause,
    });
    e.exitCode = json.data.exitCode;
    e.stack = json.data.stack;
    return e;
  }

  public toJSON(): any {
    const json = super.toJSON();
    json.data.metadata = this.metadata;
    return json;
  }
}

export {
  ErrorNetwork,
  ErrorCertChain,
  ErrorCertChainEmpty,
  ErrorCertChainUnclaimed,
  ErrorCertChainBroken,
  ErrorCertChainDateInvalid,
  ErrorCertChainNameInvalid,
  ErrorCertChainKeyInvalid,
  ErrorCertChainSignatureInvalid,
  ErrorDNSResolver,
  ErrorPolykeyRemote,
};
