import net from 'net'
import * as protobufjs from 'protobufjs';

/**
 * Returns a 5 character long random string of lower case letters
 */
function randomString(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

/**
 * Gets the first promise fulfiled
 * @param promiseList List of promises
 */
async function promiseAny<T>(promiseList: Promise<T>[]): Promise<T> {
  return await new Promise((resolve, reject) => {
    const errorList: Error[] = [];
    for (const promise of promiseList) {
      promise
        .then((p) => {
          resolve(p);
        })
        .catch((_) => null);

      promise.catch((error) => {
        errorList.push(error);
        // check if all have failed
        if (errorList.length == promiseList.length) {
          reject(errorList);
        }
      });
    }
  });
}

function protobufToString(message: Uint8Array): string {
  return protobufjs.util.base64.encode(message, 0, message.length);
}

function stringToProtobuf(str: string): Uint8Array | protobufjs.Buffer {
  const buffer = protobufjs.util.newBuffer(protobufjs.util.base64.length(str));
  protobufjs.util.base64.decode(str, buffer, 0);
  return buffer;
}

async function sleep(ms: number) {
  await new Promise((resolve, reject) => {
    setTimeout(() => resolve(), ms);
  });
}

async function tryPort(port?: number, host?: string): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (error) => reject(error));
    server.listen({port: port ?? 0, host: host ?? 'localhost'}, () => {
      const { port } = <net.AddressInfo>server.address();
      server.close(() => {
        resolve(port);
      });
    });
  })
}

async function getPort(defaultPort?: number, defaultHost?: string): Promise<number> {
  // try provided default port and host
  if (defaultPort) {
    try {
      return await tryPort(defaultPort, defaultHost)
    } catch (error) {}
  }
  // get a random port if not
  return await tryPort(0, defaultHost)
}

export { randomString, promiseAny, protobufToString, stringToProtobuf, sleep, getPort };
