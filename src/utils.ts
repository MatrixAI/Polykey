import fs from 'fs';
import net from 'net';
import path from 'path';

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
  vaultName: string;
  secretName: string;
  variableName?: string;
};

function parseSecretPath(secretPath: string): SecretPathComponents {
  const pathRegex = /^([a-zA-Z0-9_ -]+)(?::)([a-zA-Z0-9_ -]+)(?:=)?([a-zA-Z_][a-zA-Z0-9_]+)?$/;
  if (
    secretPath.length < 1 ||
    (secretPath.length == 1 && !pathRegex.test(secretPath[0]))
  ) {
    throw Error('secret path is of the wrong format');
  }

  const [_, vaultName, secretName, variableName] = secretPath.match(pathRegex)!;

  return {
    vaultName,
    secretName,
    variableName,
  };
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
    let count = 0;
    for (const promise of promiseList) {
      promise
        .then((p) => {
          outputList.push(p);
        })
        .catch((error) => {
          errorList.push(error);
        })
        .finally(() => {
          count += 1;
          if (count >= promiseList.length) {
            // check if all have failed
            if (errorList.length == promiseList.length) {
              reject(
                errorList.reduceRight((p, c) =>
                  Error(`${p.message}||${c.message}`),
                ),
              );
            } else {
              resolve(outputList);
            }
          }
        });
    }
  });
}

function protobufToString(message: Uint8Array): string {
  return Buffer.from(message).toString('base64');
}

function stringToProtobuf(str: string): Uint8Array {
  return Buffer.from(str, 'base64');
}

async function sleep(ms: number) {
  return await new Promise((r) => setTimeout(r, ms));
}

async function tryPort(port?: number, host?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const options = { port: port ?? 0, host: host ?? 'localhost' };
    const server = net
      .createServer()
      .listen(options, () => {
        const { port } = server.address() as net.AddressInfo;
        server.removeAllListeners();
        server.close(() => resolve(port));
      })
      .on('error', (error) => reject(error));
  });
}

async function getPort(
  defaultPort?: number,
  defaultHost?: string,
): Promise<number> {
  // try provided default port and host
  if (defaultPort) {
    try {
      const port = await tryPort(defaultPort, defaultHost);
      return port;
    } catch (error) {}
  }
  // get a random port if not
  const port = await tryPort(0, defaultHost);
  return port;
}

function JSONMapReplacer(key: any, value: any) {
  const originalObject = this[key];
  if (originalObject instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(originalObject.entries()),
    };
  } else {
    return value;
  }
}

function JSONMapReviver(key: any, value: any) {
  if (typeof value === 'object' && value !== null) {
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
    return true;
  }
  if (array1.length !== array2.length) {
    return false;
  }
  for (let i = 0, length = array1.length; i < length; ++i) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}

function isUnixHiddenPath(path: string): boolean {
  return /\.|\/\.[^\/]+/g.test(path);
}

async function* readdirRecursively(dir: string) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory() && !isUnixHiddenPath(dirent.name)) {
      yield* readdirRecursively(res);
    } else if (dirent.isFile()) {
      yield res;
    }
  }
}

export {
  randomString,
  parseSecretPath,
  promiseAny,
  promiseAll,
  protobufToString,
  stringToProtobuf,
  sleep,
  getPort,
  JSONMapReplacer,
  JSONMapReviver,
  arrayEquals,
  isUnixHiddenPath,
  readdirRecursively,
};
