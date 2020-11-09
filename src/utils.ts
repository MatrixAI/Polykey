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

type SecretPathComponents = {
  vaultName: string,
  secretName: string,
  variableName?: string,
}

function parseSecretPath(secretPath: string): SecretPathComponents {
  const pathRegex = /^([a-zA-Z0-9_ -]+)(?::)([a-zA-Z0-9_ -]+)(?:=)?([a-zA-Z_][a-zA-Z0-9_]+)?$/;
  if (secretPath.length < 1 || (secretPath.length == 1 && !pathRegex.test(secretPath[0]))) {
    throw Error("secret path is of the wrong format");
  }

  const [_, vaultName, secretName, variableName] = secretPath.match(pathRegex)!;

  return {
    vaultName,
    secretName,
    variableName
  }
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

/**
 * Waits until all promises are fulfiled
 * @param promiseList List of promises
 */
async function promiseAll<T>(promiseList: Promise<T>[]): Promise<T[]> {
  return await new Promise((resolve, reject) => {
    const outputList: T[] = [];
    const errorList: Error[] = [];
    let count = 0
    for (const promise of promiseList) {
      promise
        .then((p) => {
          outputList.push(p)
        })
        .catch((error) => {
          errorList.push(error)
        }).finally(() => {
          count += 1
          if (count >= promiseList.length) {
            // check if all have failed
            if (errorList.length == promiseList.length) {
              reject(errorList.reduceRight((p, c) => Error(`${p.message}||${c.message}`)));
            } else {
              resolve(outputList)
            }
          }
        })
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

function JSONMapReplacer(key: any, value: any) {
  const originalObject = this[key];
  if(originalObject instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(originalObject.entries())
    };
  } else {
    return value;
  }
}

function JSONMapReviver(key: any, value: any) {
  if(typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

/**
 * @param  {Uint8Array} Uint8Array1
 * @param  {Uint8Array} Uint8Array2
 * @return {Boolean}
 */
function arrayEquals(array1: Uint8Array, array2: Uint8Array): boolean {
  if (array1 === array2) {
    return true
  }
  if (array1.length !== array2.length) {
    return false
  }
  for (let i = 0, length = array1.length; i < length; ++i) {
    if (array1[i] !== array2[i]) {
      return false
    }
  }
  return true
}

export {
  randomString,
  promiseAny,
  promiseAll,
  protobufToString,
  stringToProtobuf,
  sleep,
  getPort,
  JSONMapReplacer,
  JSONMapReviver,
  arrayEquals,
};
