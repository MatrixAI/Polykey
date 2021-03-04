describe('main', () => {
  test('test', () => {
    expect(1).toBe(1);
  });
});

// /** To test */
// import Discovery from '@/discovery/Discovery';

// /** Mock dependencies */
// import fs from 'fs';
// import Logger from '@matrixai/js-logger';
// import KeyManager from '../../../src/keys/KeyManager';
// import GestaltTrust from '../../../src/gestalts/GestaltTrust';
// import GestaltGraph from '../../../src/gestalts/GestaltGraph';
// import NodeManager from '../../../src/nodes/NodeManager';
// import {
//   IdentityInfo,
//   ProviderManager,
//   ProviderTokens,
// } from '../../../src/identities';
// import { GitHubProvider } from '../../../src/identities/providers/github';

// /** Types */
// import type { LinkInfoIdentity } from '../../../src/links';
// import { NodePeer } from '../../../src/Polykey';

// /** Mock */
// jest.mock('../../../src/keys/KeyManager', () => {
//   return jest.fn().mockImplementation(() => {
//     return {
//       getKeyPair: () => {
//         return {
//           publicKey: 'publicKey',
//         };
//       },
//       getPublicKeyString: () => {
//         return 'PublicKeyString';
//       },
//       getPrivateKey: () => {
//         return 'privateKey';
//       },
//     };
//   });
// });
// // jest.mock('../../../src/gestalts/GestaltTrust', () => {
// //   return jest.fn().mockImplementation(() => {
// //     return {};
// //   });
// // });

// jest.mock('../../../src/nodes/NodeManager', () => {
//   return jest.fn().mockImplementation(() => {
//     return {
//       verifyLinkClaim(): Promise<boolean> {
//         return Promise.resolve(true);
//       },
//       getNode(): any {
//         return 'nodeid';
//       },
//     };
//   });
// });
// // jest.mock('../../../src/identities', () => {
// //   return {
// //     ProviderManager: jest.fn().mockImplementation(() => {
// //       return {

// //       };
// //     }),
// //     ProviderTokens: jest.fn().mockImplementation(() => {
// //       return {

// //       };
// //     })
// //   }
// // });

// // jest.mock('../../../src/identities/providers/github', () => {
// //   return {
// //     GitHubProvider: jest.fn().mockImplementation(() => {
// //       return {

// //       };
// //     })
// //   }
// // });

// // jest.mock('../../../src/gestalts/GestaltGraph', () => {
// //   return jest.fn().mockImplementation(() => {
// //     return {
// //       setIdentity: () => {

// //       },
// //       identities: {
// //         'key1' : {}
// //       }
// //     };
// //   })
// // });

// describe('Discovery', () => {
//   test('Discovery using Identities', async () => {
//     console.log('start');

//     // /** This should be transfered to a setup and teardown */
//     const fakePath = 'test';
//     const fakeKey = 'gideonairex';
//     const fakeProvider = 'github.com';
//     const logger = new Logger();

//     /** Mock  */
//     const spyGetIdentityInfo = jest
//       .spyOn(GitHubProvider.prototype, 'getIdentityInfo')
//       .mockImplementation(
//         (): Promise<IdentityInfo> => {
//           return Promise.resolve({
//             key: fakeKey,
//             provider: fakeProvider,
//           });
//         },
//       );

//     const spyGetLinkInfos = jest
//       .spyOn(GitHubProvider.prototype, 'getLinkInfos')
//       .mockImplementation(
//         async function* getLinkInfos(): AsyncGenerator<LinkInfoIdentity> {
//           yield {
//             key: 'dd',
//             type: 'identity',
//             node: 'ad',
//             identity: 'gideonairex',
//             provider: 'github.com',
//             dateIssued: '2231',
//             signature: 'adawd',
//           };
//         },
//       );

//     // /** Init */
//     const keyManager = new KeyManager(
//       fakePath,
//       fs,
//       logger.getLogger('KeyManager'),
//     );

//     const gestaltTrust = new GestaltTrust();

//     const nodeManager = new NodeManager(
//       fakePath,
//       fs,
//       keyManager,
//       logger.getLogger('NodeManager'),
//     );

//     const providerManger = new ProviderManager([
//       new GitHubProvider(
//         new ProviderTokens(fakePath, 'github.com'),
//         'ca5c4c520da868387c52',
//         logger.getLogger('ProviderManager'),
//       ),
//     ]);

//     const gestaltGraph = new GestaltGraph(
//       gestaltTrust,
//       nodeManager,
//       providerManger,
//       nodeManager.verifyLinkClaim.bind(nodeManager),
//       logger.getLogger('KeyManager'),
//     );

//     /** Intitialize Discovery */
//     const discovery = new Discovery(
//       gestaltTrust,
//       nodeManager,
//       providerManger,
//       nodeManager.verifyLinkClaim.bind(nodeManager),
//       gestaltGraph,
//     );

//     console.log('setIdentity');

//     /** setIdentity  */
//     gestaltGraph.setIdentity({
//       key: 'gideonairex',
//       provider: 'github.com',
//     });

//     console.log('discoverIdentity');

//     const discoveryNode = await discovery.discoverIdentity(
//       fakeKey,
//       fakeProvider,
//     );

//     console.log('starting');
//     await discoveryNode.next();

//     console.log(gestaltGraph.identities);
//     console.log(gestaltGraph.nodes);

//     spyGetIdentityInfo.mockRestore();
//     spyGetLinkInfos.mockRestore();
//   });
// });
