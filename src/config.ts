import fs from 'fs';

// Get available environments
const {
  PK_NODE_PATH,
  PK_NODE_HOST = 'localhost',
  PK_NODE_PORT_TCP = 5555,
  PK_NODE_PORT_UDP = 5556, // This still needs to be workout
  PK_NODE_PORT_HTTP = '8888',
  PK_NODE_ADDR_HTTP = '0.0.0.0',
  PK_NODE_MULTICAST_PORT = 5353,
  PK_BOOTSTRAP_HOSTS,
  PK_BOOTSTRAP_PORT_TCP,
  PK_BOOTSTRAP_PORT_UDP,
  PK_NODE_RELAY_PUBLIC,
  PK_BOOTSTRAP_CERTS,
} = process.env;

// Default values

// Multicast
const PK_NODE_MULTICAST_HOST = '224.0.0.251';
// Bootstrap
const DEFAULT_BOOTSTRP_CERT = [
  fs.readFileSync(__dirname + '/certs/bootstrap.polykey.io.crt').toString(),
];

export {
  PK_NODE_PATH,
  PK_NODE_HOST,
  PK_NODE_PORT_TCP,
  PK_NODE_PORT_UDP,
  PK_NODE_PORT_HTTP,
  PK_NODE_ADDR_HTTP,
  PK_NODE_MULTICAST_PORT,
  PK_NODE_MULTICAST_HOST,
  PK_BOOTSTRAP_HOSTS,
  PK_BOOTSTRAP_PORT_TCP,
  PK_BOOTSTRAP_PORT_UDP,
  PK_NODE_RELAY_PUBLIC,
  PK_BOOTSTRAP_CERTS,
  DEFAULT_BOOTSTRP_CERT,
};
