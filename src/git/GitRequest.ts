/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitRequest {
  private requestInfo: (vaultName: string) => Promise<Buffer>;
  private requestPack: (vaultName: string, body: Buffer) => Promise<Buffer>;
  private requestVaultNames: () => Promise<string[]>;

  constructor(
    requestInfo: (vaultName: string) => Promise<Buffer>,
    requestPack: (vaultName: string, body: Buffer) => Promise<Buffer>,
    requestVaultNames: () => Promise<string[]>,
  ) {
    this.requestInfo = requestInfo;
    this.requestPack = requestPack;
    this.requestVaultNames = requestVaultNames;
  }

  /**
   * The custom http request method to feed into isomorphic-git's [custom http object](https://isomorphic-git.org/docs/en/http)
   */
  async request({ url, method, headers, body }) {
    const u = new URL(url);

    // Parse request
    if (method == 'GET') {
      // Info request
      const match = u.pathname.match(/\/(.+)\/info\/refs$/);
      if (!match || /\.\./.test(match[1])) {
        throw new Error('Error');
      }

      const vaultName = match![1];

      const infoResponse = await this.requestInfo(vaultName);

      return {
        url: url,
        method: method,
        statusCode: 200,
        statusMessage: 'OK',
        body: this.iteratorFromData(infoResponse),
        headers: headers,
      };
    } else if (method == 'POST') {
      // Info request
      const match = u.pathname.match(/\/(.+)\/git-(.+)/);
      if (!match || /\.\./.test(match[1])) {
        throw new Error('Error');
      }

      const vaultName = match![1];

      const packResponse = await this.requestPack(vaultName, body[0]);

      return {
        url: url,
        method: method,
        statusCode: 200,
        statusMessage: 'OK',
        body: this.iteratorFromData(packResponse),
        headers: headers,
      };
    } else {
      throw new Error('Method not supported');
    }
  }

  async scanVaults() {
    return await this.requestVaultNames();
  }

  // ==== HELPER METHODS ==== //
  /**
   * Converts a buffer into an iterator expected by isomorphic git.
   * @param data Data to be turned into an iterator
   */
  private iteratorFromData(data: Uint8Array) {
    let ended = false;
    return {
      async next() {
        if (ended) {
          return { done: true };
        } else {
          ended = true;
          return { value: data, done: false };
        }
      },
    };
  }
}

export default GitRequest;
