import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { ClaimEncoded, ClaimIntermediary } from '../../claims/types';
import type NodeManager from '../../nodes/NodeManager';
import type { NodeId } from '../../nodes/types';
import type Sigchain from '../../sigchain/Sigchain';
import type KeyManager from '../../keys/KeyManager';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import { withF } from '@matrixai/resources';
import * as grpcUtils from '../../grpc/utils';
import * as claimsUtils from '../../claims/utils';
import * as claimsErrors from '../../claims/errors';
import * as nodesUtils from '../../nodes/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';

function nodesCrossSignClaim({
  db,
  keyManager,
  nodeManager,
  sigchain,
  logger,
}: {
  db: DB;
  keyManager: KeyManager;
  nodeManager: NodeManager;
  sigchain: Sigchain;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerDuplexStream<nodesPB.CrossSign, nodesPB.CrossSign>,
  ) => {
    const genClaims = grpcUtils.generatorDuplex(call, true);
    try {
      await withF([db.transaction()], async ([tran]) => {
        const readStatus = await genClaims.read();
        // If nothing to read, end and destroy
        if (readStatus.done) {
          throw new claimsErrors.ErrorEmptyStream();
        }
        const receivedMessage = readStatus.value;
        const intermediaryClaimMessage = receivedMessage.getSinglySignedClaim();
        if (!intermediaryClaimMessage) {
          throw new claimsErrors.ErrorUndefinedSinglySignedClaim();
        }
        const intermediarySignature = intermediaryClaimMessage.getSignature();
        if (!intermediarySignature) {
          throw new claimsErrors.ErrorUndefinedSignature();
        }
        // 3. X --> responds with double signing the Y signed claim, and also --> Y
        //             bundles it with its own signed claim (intermediate)
        // Reconstruct the claim to verify its signature
        const constructedIntermediaryClaim: ClaimIntermediary = {
          payload: intermediaryClaimMessage.getPayload(),
          signature: {
            protected: intermediarySignature.getProtected(),
            signature: intermediarySignature.getSignature(),
          },
        };
        // Get the sender's node ID from the claim
        const constructedEncodedClaim: ClaimEncoded = {
          payload: intermediaryClaimMessage.getPayload(),
          signatures: [
            {
              protected: intermediarySignature.getProtected(),
              signature: intermediarySignature.getSignature(),
            },
          ],
        };
        const decodedClaim = claimsUtils.decodeClaim(constructedEncodedClaim);
        const payloadData = decodedClaim.payload.data;
        if (payloadData.type !== 'node') {
          throw new claimsErrors.ErrorNodesClaimType();
        }
        const {
          nodeId,
        }: {
          nodeId: NodeId;
        } = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [['nodeId'], () => validationUtils.parseNodeId(value)],
              () => value,
            );
          },
          {
            nodeId: payloadData.node1,
          },
        );
        // Verify the claim
        const senderPublicKey = await nodeManager.getPublicKey(nodeId);
        const verified = await claimsUtils.verifyClaimSignature(
          constructedEncodedClaim,
          senderPublicKey,
        );
        if (!verified) {
          throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
        }
        // If verified, add your own signature to the received claim
        const doublySignedClaim = await claimsUtils.signIntermediaryClaim({
          claim: constructedIntermediaryClaim,
          privateKey: keyManager.getRootKeyPairPem().privateKey,
          signeeNodeId: nodesUtils.encodeNodeId(keyManager.getNodeId()),
        });
        // Then create your own intermediary node claim (from X -> Y)
        const singlySignedClaim = await sigchain.createIntermediaryClaim(
          {
            type: 'node',
            node1: nodesUtils.encodeNodeId(keyManager.getNodeId()),
            node2: payloadData.node1,
          },
          tran,
        );
        // Should never be reached, but just for type safety
        if (!doublySignedClaim.payload || !singlySignedClaim.payload) {
          throw new claimsErrors.ErrorClaimsUndefinedClaimPayload();
        }
        // Write both these claims to a message to send
        const crossSignMessage = claimsUtils.createCrossSignMessage({
          singlySignedClaim,
          doublySignedClaim,
        });
        await genClaims.write(crossSignMessage);
        // 4. We expect to receive our singly signed claim we sent to now be a
        // doubly signed claim (signed by the other node).
        const responseStatus = await genClaims.read();
        if (responseStatus.done) {
          throw new claimsErrors.ErrorEmptyStream();
        }
        const receivedResponse = responseStatus.value;
        const receivedDoublySignedClaimMessage =
          receivedResponse.getDoublySignedClaim();
        if (!receivedDoublySignedClaimMessage) {
          throw new claimsErrors.ErrorUndefinedDoublySignedClaim();
        }
        // Reconstruct the expected object from message
        const constructedDoublySignedClaim: ClaimEncoded = {
          payload: receivedDoublySignedClaimMessage.getPayload(),
          signatures: receivedDoublySignedClaimMessage
            .getSignaturesList()
            .map((sMsg) => {
              return {
                protected: sMsg.getProtected(),
                signature: sMsg.getSignature(),
              };
            }),
        };
        // Verify the doubly signed claim with both our public key, and the sender's
        const verifiedDoubly =
          (await claimsUtils.verifyClaimSignature(
            constructedDoublySignedClaim,
            keyManager.getRootKeyPairPem().publicKey,
          )) &&
          (await claimsUtils.verifyClaimSignature(
            constructedDoublySignedClaim,
            senderPublicKey,
          ));
        if (!verifiedDoubly) {
          throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
        }
        // If verified, then we can safely add to our sigchain
        await sigchain.addExistingClaim(constructedDoublySignedClaim, tran);
        // Close the stream
        await genClaims.next(null);
        return;
      });
    } catch (e) {
      await genClaims.throw(e);
      logger.error(e);
      return;
    }
  };
}

export default nodesCrossSignClaim;
