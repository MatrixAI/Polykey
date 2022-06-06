import type { ServerSurfaceCall } from '@grpc/grpc-js/build/src/server-call';
import type ErrorPolykey from '../ErrorPolykey';
import type { Host, Port } from '../network/types';
import type Proxy from '../network/Proxy';
import type { ConnectionInfoGet, AgentClientErrors } from './types';
import * as validationErrors from '../validation/errors';

/**
 * Array of errors that are always considered to be "client errors"
 * (4xx errors in HTTP) in the context of the agent service
 */
const defaultClientErrors: AgentClientErrors = [
  validationErrors.ErrorValidation,
];

function connectionInfoGetter(proxy: Proxy): ConnectionInfoGet {
  return (call: ServerSurfaceCall) => {
    let urlString = call.getPeer();
    if (!/^.*:\/\//.test(urlString)) urlString = 'pk://' + urlString;
    const url = new URL(urlString);
    return proxy.getConnectionInfoByReverse(
      url.hostname as Host,
      parseInt(url.port) as Port,
    );
  };
}

/**
 * Checks whether an error is a "client error" (4xx errors in HTTP)
 * Used by the service handlers since client errors should not be
 * reported on the server side
 * Additional errors that are considered to be client errors in the
 * context of a given handler can be supplied in the `extraClientErrors`
 * argument
 */
function isAgentClientError(
  thrownError: ErrorPolykey<any>,
  extraClientErrors?: AgentClientErrors,
): boolean {
  for (const error of defaultClientErrors) {
    if (Array.isArray(error)) {
      let e = thrownError;
      let matches = true;
      for (const eType of error) {
        if (e == null) {
          matches = false;
          break;
        }
        if (!(e instanceof eType)) {
          matches = false;
          break;
        }
        e = e.cause;
      }
      if (matches) return true;
    } else if (thrownError instanceof error) {
      return true;
    }
  }
  if (extraClientErrors) {
    for (const error of extraClientErrors) {
      if (Array.isArray(error)) {
        let e = thrownError;
        let matches = true;
        for (const eType of error) {
          if (e == null) {
            matches = false;
            break;
          }
          if (!(e instanceof eType)) {
            matches = false;
            break;
          }
          e = e.cause;
        }
        if (matches) return true;
      } else if (thrownError instanceof error) {
        return true;
      }
    }
  }
  return false;
}

export { connectionInfoGetter, isAgentClientError };
