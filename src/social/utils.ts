import type { AddressInfo } from 'net';
import type { AuthCodeData } from './types';

import os from 'os';
import process from 'process';
import { spawn } from 'child_process';
import http from 'http';
import { createHttpTerminator } from 'http-terminator';

function browser(url: string): void {
  let platform = process.platform;
  if (platform === 'linux' && os.release().indexOf('Microsoft') !== -1) {
    platform = 'win32';
  }
  let command;
  switch (platform) {
    case 'win32': {
      command = 'cmd.exe';
      break;
    }
    case 'darwin': {
      command = 'open';
      break;
    }
    default: {
      command = 'xdg-open';
      break;
    }
  }
  let args = [url];
  if (platform === 'win32') {
    // On Windows, we really want to use the "start" command. But, the rules
    // regarding arguments with spaces, and escaping them with quotes, can get
    // really arcane. So the easiest way to deal with this is to pass off the
    // responsibility to "cmd /c", which has that logic built in.
    //
    // Furthermore, if "cmd /c" double-quoted the first parameter, then "start"
    // will interpret it as a window title, so we need to add a dummy
    // empty-string window title: http://stackoverflow.com/a/154090/3191
    //
    // Additionally, on Windows ampersand and caret need to be escaped when
    // passed to "start"
    args = args.map(function (value) {
      return value.replace(/[&^]/g, '^$&');
    });
    args = ['/c', 'start', '""'].concat(args);
  }
  const browserProcess = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  browserProcess.unref();
}

class AuthCodeServer {
  public readonly port: number;
  protected server: http.Server;
  protected httpTerminator: { terminate: () => void };
  protected status: 'initial' | 'started' | 'stopped';
  protected redirectUri?: string;

  public constructor(port: number = 0) {
    this.port = port;
    this.server = http.createServer();
    this.httpTerminator = createHttpTerminator({ server: this.server });
    this.status = 'initial';
  }

  public async start(
    handleAuthCodeData: (d: AuthCodeData, u: string) => void,
  ): Promise<string> {
    if (this.status === 'started') {
      return this.redirectUri!;
    }
    const serverListen = new Promise<number>((resolve) => {
      this.server.listen(this.port, '127.0.0.1', () => {
        resolve((this.server.address() as AddressInfo).port);
      });
    });
    const port = await serverListen;
    this.redirectUri = `http://127.0.0.1:${port}`;
    this.server.on(
      'request',
      async (request: http.IncomingMessage, response: http.ServerResponse) => {
        const url = new URL(request.url!, `http://${request.headers.host}`);
        const code = url.searchParams.get('code') || undefined;
        const state = url.searchParams.get('state') || undefined;
        const error = url.searchParams.get('error') || undefined;
        const errorDescription =
          url.searchParams.get('error_description') || undefined;
        if (!code && !error) {
          response.writeHead(400);
          response.end();
          return;
        }
        response.end('Close this window!');
        let authCodeData;
        if (code) {
          authCodeData = { status: 'success', code, state };
        } else if (error) {
          authCodeData = { status: 'failure', error, errorDescription };
        }
        handleAuthCodeData(authCodeData, this.redirectUri!);
        await this.stop();
      },
    );
    this.status = 'started';
    return this.redirectUri;
  }

  public async stop(): Promise<void> {
    if (this.status === 'started') {
      await this.httpTerminator.terminate();
    }
    this.status = 'stopped';
  }
}

export { browser, AuthCodeServer };
