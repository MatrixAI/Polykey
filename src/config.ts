// @ts-ignore package.json is outside rootDir
import { version } from '../package.json';

/**
 * Polykey static configuration
 * This is intended only for static properties
 * These properties are embedded in the source code
 * And they are not to be changed during runtime
 */
const config = {
  /**
   * Version of source code
   * This must match the package.json
   */
  sourceVersion: version,
  /**
   * Version of the state, persisted into the node state
   * It is only incremented on breaking changes
   * Use this to know if you have to do a schema-upgrade
   */
  stateVersion: 1,
  /**
   * Version of the gRPC and HTTP service
   * It is only incremented on breaking changes
   * Use this to know if you must upgrade your service client
   */
  serviceVersion: 1,
  /**
   * Default provider configuration
   * These are managed by Matrix AI and Polykey developers
   */
  providers: {
    'github.com': {
      clientId: 'ca5c4c520da868387c52',
    },
  },
  /**
   * Polykey OIDs
   * These are used by the root X.509 certificates
   * These are managed by Matrix AI and Polykey developers
   * Starts on 1.3.6.1.4.1.57167.2
   * See: http://oid-info.com/get/1.3.6.1.4.1.57167
   */
  oids: {
    // Extensions start on 1.3.6.1.4.1.57167.2.2
    extensions: {
      polykeyVersion: '1.3.6.1.4.1.57167.2.2.1',
      nodeSignature: '1.3.6.1.4.1.57167.2.2.2',
    },
  },
};

export default config;
