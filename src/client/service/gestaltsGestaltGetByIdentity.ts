import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';
import * as clientUtils from '../utils';
import * as nodesUtils from '../../nodes/utils';

function gestaltsGestaltGetByIdentity({
  authenticate,
  gestaltGraph,
  db,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, gestaltsPB.Graph>,
    callback: grpc.sendUnaryData<gestaltsPB.Graph>,
  ): Promise<void> => {
    try {
      const response = new gestaltsPB.Graph();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        providerId,
        identityId,
      }: {
        providerId: ProviderId;
        identityId: IdentityId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerId'], () => validationUtils.parseProviderId(value)],
            [['identityId'], () => validationUtils.parseIdentityId(value)],
            () => value,
          );
        },
        {
          providerId: call.request.getProviderId(),
          identityId: call.request.getIdentityId(),
        },
      );
      const gestalt = await db.withTransactionF((tran) =>
        gestaltGraph.getGestaltByIdentity([providerId, identityId], tran),
      );
      if (gestalt != null) {
        const newGestalt = {
          matrix: {},
          nodes: {},
          identities: gestalt.identities,
        };
        for (const [key, value] of Object.entries(gestalt.nodes)) {
          newGestalt.nodes[key] = {
            nodeId: nodesUtils.encodeNodeId(value.nodeId),
          };
        }
        for (const keyA of Object.keys(gestalt.matrix)) {
          for (const keyB of Object.keys(gestalt.matrix[keyA])) {
            let record = newGestalt.matrix[keyA];
            if (record == null) {
              record = {};
              newGestalt.matrix[keyA] = record;
            }
            record[keyB] = null;
          }
        }
        response.setGestaltGraph(JSON.stringify(newGestalt));
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${gestaltsGestaltGetByIdentity.name}:${e}`);
      return;
    }
  };
}

export default gestaltsGestaltGetByIdentity;
