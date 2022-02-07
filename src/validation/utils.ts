/**
 * Parsing utilities for validating all input data
 * This pulls in domain types and performs procedural-validation
 * All functions here must marshal `data: any` into their respective domain type
 * Failing to do so, they must throw the `validationErrors.ErrorParse`
 * The parse error message must focus on why the validation failed
 * @module
 */
import type { NodeId } from '../nodes/types';
import type { ProviderId, IdentityId } from '../identities/types';
import type { GestaltAction, GestaltId } from '../gestalts/types';
import type { VaultAction } from '../vaults/types';
import type { Host, Hostname, Port } from '../network/types';
import type { ClaimId } from '../claims/types';
import * as validationErrors from './errors';
import * as nodesUtils from '../nodes/utils';
import * as gestaltsUtils from '../gestalts/utils';
import * as vaultsUtils from '../vaults/utils';
import * as networkUtils from '../network/utils';
import * as claimsUtils from '../claims/utils';

function parseInteger(data: any): number {
  data = parseInt(data);
  if (isNaN(data)) {
    throw new validationErrors.ErrorParse('Number is invalid');
  }
  return data;
}

function parseNumber(data: any): number {
  data = parseFloat(data);
  if (isNaN(data)) {
    throw new validationErrors.ErrorParse('Number is invalid');
  }
  return data;
}

function parseNodeId(data: any): NodeId {
  data = nodesUtils.decodeNodeId(data);
  if (data == null) {
    throw new validationErrors.ErrorParse(
      'Node ID must be multibase base32hex encoded public-keys',
    );
  }
  return data;
}

function parseGestaltId(data: any): GestaltId {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Gestalt ID must be string');
  }
  data = nodesUtils.decodeNodeId(data);
  if (data != null) {
    return {
      type: 'node',
      nodeId: data,
    };
  }
  const match = (data as string).match(/^(.+):(.+)$/);
  if (match == null) {
    throw new validationErrors.ErrorParse(
      'Gestalt ID must be either a Node ID or `Provider ID:Identity ID`',
    );
  }
  const providerId = parseProviderId(match[1]);
  const identityId = parseIdentityId(match[2]);
  return {
    type: 'identity',
    providerId,
    identityId,
  };
}

function parseClaimId(data: any): ClaimId {
  data = claimsUtils.decodeClaimId(data);
  if (data == null) {
    throw new validationErrors.ErrorParse(
      'Claim ID must be multibase base32hex encoded strings',
    );
  }
  return data;
}

function parseGestaltAction(data: any): GestaltAction {
  if (!gestaltsUtils.isGestaltAction(data)) {
    throw new validationErrors.ErrorParse(
      'Gestalt action must be `notify` or `scan`',
    );
  }
  return data;
}

function parseVaultAction(data: any): VaultAction {
  if (!vaultsUtils.isVaultAction(data)) {
    throw new validationErrors.ErrorParse(
      'Vault action must be `clone` or `pull`',
    );
  }
  return data;
}

function parseProviderId(data: any): ProviderId {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Provider ID must be a string');
  }
  if (data.length < 1) {
    throw new validationErrors.ErrorParse(
      'Provider ID length must be greater than 0',
    );
  }
  return data as ProviderId;
}

function parseIdentityId(data: any): IdentityId {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Provider ID must be a string');
  }
  if (data.length < 1) {
    throw new validationErrors.ErrorParse(
      'Identity ID length must be greater than 0',
    );
  }
  return data as IdentityId;
}

function parseHost(data: any): Host {
  if (!networkUtils.isHost(data)) {
    throw new validationErrors.ErrorParse(
      'Host must be an IPv4 or IPv6 address',
    );
  }
  return data;
}

function parseHostname(data: any): Hostname {
  if (!networkUtils.isHostname(data)) {
    throw new validationErrors.ErrorParse(
      'Hostname must follow RFC 1123 standard',
    );
  }
  return data;
}

function parseHostOrHostname(data: any): Host | Hostname {
  if (!networkUtils.isHost(data) && !networkUtils.isHostname(data)) {
    throw new validationErrors.ErrorParse(
      'Host must be IPv4 or IPv6 address or hostname',
    );
  }
  return data;
}

/**
 * Parses number into a Port
 * Data can be a string-number
 */
function parsePort(data: any): Port {
  if (typeof data === 'string') {
    try {
      data = parseInteger(data);
    } catch (e) {
      if (e instanceof validationErrors.ErrorParse) {
        e.message = 'Port must be a number';
      }
      throw e;
    }
  }
  if (!networkUtils.isPort(data)) {
    throw new validationErrors.ErrorParse(
      'Port must be a number between 0 and 65535 inclusive',
    );
  }
  return data;
}

export {
  parseInteger,
  parseNumber,
  parseNodeId,
  parseGestaltId,
  parseClaimId,
  parseGestaltAction,
  parseVaultAction,
  parseProviderId,
  parseIdentityId,
  parseHost,
  parseHostname,
  parseHostOrHostname,
  parsePort,
};
