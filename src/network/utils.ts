import net from 'net';

function buildAddress(host: string, port: number = 0): string {
  let address;
  if (net.isIPv4(host)) {
    address = `${host}:${port}`;
  } else if (net.isIPv6(host)) {
    address = `[${host}]:${port}`;
  } else {
    address = `${host}:${port}`;
  }
  return address;
}

export { buildAddress };
