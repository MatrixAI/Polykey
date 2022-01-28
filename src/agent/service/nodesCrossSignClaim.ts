import type * as grpc from '@grpc/grpc-js';
import type { ClaimEncoded, ClaimIntermediary } from '../../claims/types';
import type { NodeManager } from '../../nodes';
import type { Sigchain } from '../../sigchain';
import type { KeyManager } from '../../keys';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as grpcUtils } from '../../grpc';
import { utils as claimsUtils, errors as claimsErrors } from '../../claims';
import { utils as nodesUtils } from '../../nodes';

function nodesCrossSignClaim({
  keyManager,
  nodeManager,
  sigchain,
}: {
  keyManager: KeyManager;
  nodeManager: NodeManager;
  sigchain: Sigchain;
}) {
  return async (
    call: grpc.ServerDuplexStream<nodesPB.CrossSign, nodesPB.CrossSign>,
  ) => {
    // TODO: Move all "await genClaims.throw" to a final catch(). Wrap this
    // entire thing in a try block. And re-throw whatever error is caught
    const genClaims = grpcUtils.generatorDuplex(call);
    try {
      await sigchain.transaction(async (sigchain) => {
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
        // Verify the claim
        const senderPublicKey = await nodeManager.getPublicKey(
          nodesUtils.decodeNodeId(payloadData.node1),
        );
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
          signeeNodeId: nodesUtils.encodeNodeId(nodeManager.getNodeId()),
        });
        // Then create your own intermediary node claim (from X -> Y)
        const singlySignedClaim = await sigchain.createIntermediaryClaim({
          type: 'node',
          node1: nodesUtils.encodeNodeId(nodeManager.getNodeId()),
          node2: payloadData.node1,
        });
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
          await genClaims.throw(
            new claimsErrors.ErrorDoublySignedClaimVerificationFailed(),
          );
        }
        // If verified, then we can safely add to our sigchain
        await sigchain.addExistingClaim(constructedDoublySignedClaim);
        // Close the stream
        await genClaims.next(null);
      });
    } catch (e) {
      await genClaims.throw(e);
      // TODO: Handle the exception on this server - throw e?
      // throw e;
    }
  };
}

export default nodesCrossSignClaim;
