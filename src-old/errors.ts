import type { POJO } from './types';

import { outputFormatter } from './bin/utils';
import { CustomError } from 'ts-custom-error';

class ErrorPolykey extends CustomError {
  constructor(message: string, data?: POJO) {
    if (data) {
      message += outputFormatter({
        type: 'dict',
        data: data,
      });
    }
    super(message);
  }
}

class ErrorPolykeyAgent extends ErrorPolykey {}

// Creating polykey instance when a instance already exists
class ErrorPolykeyDefined extends ErrorPolykeyAgent {}

// Starting polykey when no instance exists
class ErrorPolykeyUndefined extends ErrorPolykeyAgent {}

// Could not find a port to connect to
class ErrorPortConnect extends ErrorPolykeyAgent {}

// Node did not respond before timeout
class ErrorNodeResponse extends ErrorPolykeyAgent {}

// Mnemonic provided was incorrect
class ErrorMnemonic extends ErrorPolykeyAgent {}

// User code for authentication was not a string
class ErrorUserCode extends ErrorPolykeyAgent {}

// Paths for keys was not valid
class ErrorKeyPath extends ErrorPolykeyAgent {}

// No gestalt was found by search
class ErrorGestaltUndefined extends ErrorPolykeyAgent {}

// Attempting to modify other nodes info
class ErrorNodeInfoSecure extends ErrorPolykeyAgent {}

// Performing operations on a locked polykey instance
class ErrorLocked extends ErrorPolykeyAgent {}

// File could not be verified
class ErrorVerifyFile extends ErrorPolykeyAgent {}

// Desired node could not be identified
class ErrorNodeIdentify extends ErrorPolykeyAgent {}

// Polykey cannot connect as agent is offline
class ErrorPolykeyOffline extends ErrorPolykeyAgent {}

// Base API error class
class ErrorAPI extends ErrorPolykey {}

// Accessing a client that does not exist
class ErrorClientUndefined extends ErrorAPI {}

// Provided secret does not match stored secret
class ErrorInvalidSecret extends ErrorAPI {}

// Accessing an authorization code that does not exist
class ErrorAuthCodeUndefined extends ErrorAPI {}

// Accessing a token that does not exist
class ErrorTokenUndefined extends ErrorAPI {}

// Accessing a user that does not exist
class ErrorUserUndefined extends ErrorAPI {}

// Provided cridentials do not match the expected cridentials
class ErrorInvalidCredentials extends ErrorAPI {}

class ErrorInvalidToken extends ErrorAPI {}

// Base error class for Git
class ErrorGestalts extends ErrorPolykey {}

// Calling functions that are not yet implemented
class ErrorGestaltUnimplemented extends ErrorGestalts {}

// Base error class for Git
class ErrorGit extends ErrorPolykey {}

// Input URL does not match reference
class ErrorURLParse extends ErrorGit {}

// Unsupported method for http request
class ErrorGitMethod extends ErrorGit {}

// Desired repository does not exist
class ErrorRepoUndefined extends ErrorGit {}

// Request to gitpack must be prefixed by 'want'
class ErrorMessagePrefix extends ErrorGit {}

// Cannot find the desired reference
class ErrorReferenceUndefined extends ErrorGit {}

// Base error for git commit
class ErrorGitCommit extends ErrorGit {}

// Commit message or parent has invalid type
class ErrorTypeCommit extends ErrorGitCommit {}

// Base error class for Git Object
class ErrorGitObject extends ErrorGit {}

// Incorrect SHA encryption used
class ErrorSHAEncryption extends ErrorGitObject {}

// Reading in the Git Object
class ErrorGitRead extends ErrorGitObject {}

// Base error class for Git Tree
class ErrorGitTree extends ErrorGit {}

// File mode does not match an expected mode
class ErrorGitUnrecognisedFile extends ErrorGitTree {}

// Object paased does not have a recognised type
class ErrorGitUnrecognisedType extends ErrorGitTree {}

// Base error class for indentities
class ErrorIdentities extends ErrorPolykey {}

// Error in getting info from provider or publishing a link claim
class ErrorProviderCall extends ErrorIdentities {}

// Call to an unimplemented provider function
class ErrorProviderUnimplemented extends ErrorIdentities {}

// Invalid response from provider
class ErrorProviderAuthentication extends ErrorIdentities {}

// Invalude access token provided
class ErrorProviderUnauthenticated extends ErrorIdentities {}

// Base error class for Keys
class ErrorKeys extends ErrorPolykey {}

// Accessing public/private keys when they are not loaded
class ErrorKeyUndefined extends ErrorKeys {}

// Attempting to sign data without an appropriate passphrase
class ErrorNoPassphrase extends ErrorKeys {}

// Base error class for Broadcasting
class ErrorNetwork extends ErrorPolykey {}

// Base error class for Broadcasting
class ErrorMTP extends ErrorNetwork {}

// The provided port number is not valid
class ErrorPortNumber extends ErrorMTP {}

// Packet was not received
class ErrorNoPacket extends ErrorMTP {}

// Base error class for Broadcasting
class ErrorMulticast extends ErrorNetwork {}

// Receiving a message from the current node
class ErrorSelfMessage extends ErrorMulticast {}

// Receiving a message from an unknown node
class ErrorUnknownNodeMessage extends ErrorMulticast {}

// Base error class for Nodes
class ErrorNodes extends ErrorPolykey {}

// Base error class for Nodes Manager
class ErrorNode extends ErrorNodes {}

// Attempting to parse an empty address string
class ErrorAddressParse extends ErrorNode {}

// Attempting to rewrite the current nodes public key
class ErrorPubKeyChange extends ErrorNode {}

// Attempting to change information of peers node
class ErrorNodePeerInfoChange extends ErrorNode {}

// Attempting to add an existing node
class ErrorNodeDefined extends ErrorNode {}

// Performing an operation on a node that does not exist
class ErrorNodeUndefined extends ErrorNode {}

// Attempting to add/connect to self node
class ErrorNodeSelf extends ErrorNode {}

// Attempting to remove an alias for a node with no alias
class ErrorNoAlias extends ErrorNode {}

// Base error class for KBucket
class ErrorKBucket extends ErrorNodes {}

// Attempting to update a new contact with an old contact
class ErrorUpdateKBucket extends ErrorKBucket {}

// Attempting to get n closest nodes when n is not a positive number
class ErrorContactsAmount extends ErrorKBucket {}

// Base error class for NodeDHT
class ErrorNodeDHT extends ErrorNodes {}

// Attempting to find the closest nodes when none exist
class ErrorCloseNodesUndefined extends ErrorNodeDHT {}

// Node Info was not found from kademlia
class ErrorNodeIDUndefined extends ErrorNodeDHT {}

// Base error class for Node Connections
class ErrorNodeConnection extends ErrorNodes {}

// Attempting to connect to a node when a connection already exists
class ErrorConnectionExists extends ErrorNodeConnection {}

// Appropriate node info could not be found in the DHT or node store
class ErrorFindNode extends ErrorNodeConnection {}

// Not a node relay attempting to get UDP address of another node
class ErrorNodeNotRelay extends ErrorNodeConnection {}

// Base Error class for PKI
class ErrorPKI extends ErrorNodes {}

// Attempting to sign a certificate with an unverified signature
class ErrorUnverifiedSignature extends ErrorPKI {}

// Base Error Class for Vaults
class ErrorVaults extends ErrorPolykey {}

// Instantiating a secret that already exists
class ErrorSecretDefined extends ErrorVaults {}

// Accessing a secret that does not exist
class ErrorSecretUndefined extends ErrorVaults {}

// Provided path to secret is of incorrect format
class ErrorSecretPath extends ErrorVaults {}

// Using functions that are not implemented
class ErrorVaultUnimplemented extends ErrorVaults {}

// Sharing/unsharing a vault which is already being shared/unshared
class ErrorVaultSharing extends ErrorVaults {}

// Instantiate a vault that already exists
class ErrorVaultDefined extends ErrorVaults {}

// Perform an operation on a vault that does not exist
class ErrorVaultUndefined extends ErrorVaults {}

// Deleting a vault non-recursively
class ErrorVaultDelete extends ErrorVaults {}

// Accessing a vault without with appropriate key
class ErrorVaultKeyUndefined extends ErrorVaults {}

// Base class for CLI errors
class ErrorCLI extends ErrorPolykey {}

// Base class for CLI Agent
class ErrorCommandAgent extends ErrorCLI {}

// Base class for CLI CA
class ErrorCommandCA extends ErrorCLI {}

// Base class for CLI Crypto
class ErrorCommandCrypto extends ErrorCLI {}

// Base class for CLI Gestalts
class ErrorCommandGestalts extends ErrorCLI {}

// Base class for CLI Indentities
class ErrorCommandIdentities extends ErrorCLI {}

// Base class for CLI Keys
class ErrorCommandKeys extends ErrorCLI {}

// Base class for CLI Nodes
class ErrorCommandNodes extends ErrorCLI {}

// Base class for CLI OAuth
class ErrorCommandOAuth extends ErrorCLI {}

// Base class for CLI Secrets
class ErrorCommandSecrets extends ErrorCLI {}

// Base class for CLI Vaults
class ErrorCommandVaults extends ErrorCLI {}

export {
  ErrorPolykey,
  ErrorPolykeyAgent,
  ErrorPolykeyDefined,
  ErrorPolykeyUndefined,
  ErrorNodeResponse,
  ErrorLocked,
  ErrorPortConnect,
  ErrorNodeIdentify,
  ErrorPolykeyOffline,
  ErrorMnemonic,
  ErrorUserCode,
  ErrorKeyPath,
  ErrorGestaltUndefined,
  ErrorNodeInfoSecure,
  ErrorVerifyFile,
  ErrorAPI,
  ErrorClientUndefined,
  ErrorInvalidSecret,
  ErrorAuthCodeUndefined,
  ErrorTokenUndefined,
  ErrorUserUndefined,
  ErrorInvalidCredentials,
  ErrorInvalidToken,
  ErrorGestalts,
  ErrorGestaltUnimplemented,
  ErrorGit,
  ErrorURLParse,
  ErrorGitMethod,
  ErrorRepoUndefined,
  ErrorMessagePrefix,
  ErrorReferenceUndefined,
  ErrorGitCommit,
  ErrorTypeCommit,
  ErrorGitObject,
  ErrorSHAEncryption,
  ErrorGitRead,
  ErrorGitTree,
  ErrorGitUnrecognisedFile,
  ErrorGitUnrecognisedType,
  ErrorIdentities,
  ErrorProviderCall,
  ErrorProviderUnimplemented,
  ErrorProviderAuthentication,
  ErrorProviderUnauthenticated,
  ErrorKeys,
  ErrorKeyUndefined,
  ErrorNoPassphrase,
  ErrorNetwork,
  ErrorMTP,
  ErrorPortNumber,
  ErrorNoPacket,
  ErrorMulticast,
  ErrorSelfMessage,
  ErrorUnknownNodeMessage,
  ErrorNodes,
  ErrorNode,
  ErrorAddressParse,
  ErrorPubKeyChange,
  ErrorNodePeerInfoChange,
  ErrorNodeDefined,
  ErrorNodeUndefined,
  ErrorNodeSelf,
  ErrorNoAlias,
  ErrorKBucket,
  ErrorUpdateKBucket,
  ErrorContactsAmount,
  ErrorNodeDHT,
  ErrorCloseNodesUndefined,
  ErrorNodeIDUndefined,
  ErrorNodeConnection,
  ErrorConnectionExists,
  ErrorFindNode,
  ErrorNodeNotRelay,
  ErrorPKI,
  ErrorUnverifiedSignature,
  ErrorVaults,
  ErrorSecretDefined,
  ErrorSecretUndefined,
  ErrorSecretPath,
  ErrorVaultUnimplemented,
  ErrorVaultSharing,
  ErrorVaultDefined,
  ErrorVaultUndefined,
  ErrorVaultDelete,
  ErrorVaultKeyUndefined,
};
