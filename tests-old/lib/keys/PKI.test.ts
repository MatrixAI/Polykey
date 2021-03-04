/* eslint-disable */
import fs from 'fs';
import os from 'os';
import net from 'net';
import http from 'https';
import forge from 'node-forge';
import * as grpc from '@grpc/grpc-js';
import { randomString } from '../../../src/utils';
import { KeyManager } from '../../../src/Polykey';
import { NodeMessage, SubServiceType } from '@/proto/js/Node_pb';
import { NodeClient, NodeService } from '@/proto/js/Node_grpc_pb';
import { TLSCredentials } from '../../../src/nodes/pki/PublicKeyInfrastructure';

// TODO: part of adding PKI functionality to polykey
describe('PKI testing', () => {
  let tempDirNodeCA: string
  let kmCA: KeyManager

  let tempDirNodeA: string
  let kmA: KeyManager

  let tempDirNodeB: string
  let kmB: KeyManager

  beforeAll(async () => {
    // ======== CA PEER ======== //
    // Define temp directory
    tempDirNodeCA = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create pki
    kmCA = new KeyManager(tempDirNodeCA, fs)
    await kmCA.generateKeyPair('kmCA', 'passphrase')

    // ======== PEER A ======== //
    // Define temp directory
    tempDirNodeA = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create pki
    kmA = new KeyManager(tempDirNodeA, fs)
    await kmA.generateKeyPair('kmA', 'passphrase')
    kmA.pki.addCA(kmCA.pki.RootCert)

    // ======== PEER B ======== //
    // Define temp directory
    tempDirNodeB = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create pki
    kmB = new KeyManager(tempDirNodeB, fs)
    await kmB.generateKeyPair('kmB', 'passphrase')
    kmB.pki.addCA(kmCA.pki.RootCert)
  })

  afterAll(() => {
    fs.rmdirSync(tempDirNodeCA, { recursive: true })
    fs.rmdirSync(tempDirNodeA, { recursive: true })
    fs.rmdirSync(tempDirNodeB, { recursive: true })
  })

  test('can request a certificate from a ca node', () => {
    const csr = kmA.pki.createCSR('localhost', 'passphrase')
    const certificate = kmCA.pki.handleCSR(csr)
    expect(certificate).not.toEqual(undefined)
    expect(1+1).toEqual(2);
  })

  describe('Transport Layer Security', () => {
    let tlsServerCredentials: TLSCredentials
    let tlsClientCredentials: TLSCredentials

    beforeAll(() => {
      // request certificates from CA for both kmA.pki and kmB.pki
      // ==== PEER A ==== //
      const csrA = kmA.pki.createCSR('localhost', 'passphrase')
      kmA.pki.importCertificate(kmCA.pki.handleCSR(csrA))
      // ==== PEER B ==== //
      const csrB = kmB.pki.createCSR('localhost', 'passphrase')
      kmB.pki.importCertificate(kmCA.pki.handleCSR(csrB))

      // kmA.pki will provide the server credentials and kmB.pki will provide the client credentials
      tlsServerCredentials = kmA.pki.TLSServerCredentials!
      tlsClientCredentials = kmB.pki.TLSClientCredentials!
    })

    test('can use certificates to create an mtls connection', done => {
      // set up the mock server
      const randomSecureMessage = `random-secure-message: ${randomString()}\n`
      const server = http.createServer({
        key: tlsServerCredentials!.keypair.private,
        cert: tlsServerCredentials!.certificate,
        ca: [tlsServerCredentials!.rootCertificate],
        // requestCert: true
      }, (req, res) => {
        res.writeHead(200);
        res.end(randomSecureMessage);
      }).listen(0, 'localhost', () => {

        const serverAddress = <net.AddressInfo>server.address()

        const req = http.request({
          host: 'localhost',
          port: serverAddress.port,
          path: '/',
          method: 'GET',
          key: tlsClientCredentials!.keypair.private,
          cert: tlsClientCredentials!.certificate,
          ca: [tlsClientCredentials!.rootCertificate]
        }, (res) => {
          res.on('data', (d) => {
            expect(d.toString()).toEqual(randomSecureMessage)
            done()
          });
        })

        req.on('error', (e) => {
          expect(e).toBeUndefined()
          done()
        });

        req.end()
      })
    })
  })

  describe('gRPC TLS', () => {
    let tlsServerCredentials: TLSCredentials
    let tlsClientCredentials: TLSCredentials

    beforeAll(() => {
      // request certificates from CA for both kmA.pki and kmB.pki
      // ==== PEER A ==== //
      const csrA = kmA.pki.createCSR('localhost', 'passphrase')
      kmA.pki.importCertificate(kmCA.pki.handleCSR(csrA))
      // ==== PEER B ==== //
      const csrB = kmB.pki.createCSR('localhost', 'passphrase')
      kmB.pki.importCertificate(kmCA.pki.handleCSR(csrB))

      // kmA.pki will provide the server credentials and kmB.pki will provide the client credentials
      tlsServerCredentials = kmA.pki.TLSServerCredentials!
      tlsClientCredentials = kmB.pki.TLSClientCredentials!
    })

    test('can create a gRPC server and client', done => {
      const server = new grpc.Server();
      server.addService(NodeService, {
        messageNode: async (call, callback) => {
          const nodeRequest: NodeMessage = call.request;
          // echo server
          callback(null, nodeRequest);
        },
      });
      const serverCredentials = grpc.ServerCredentials.createSsl(
        Buffer.from(tlsServerCredentials.rootCertificate),
        [
          {
            private_key: Buffer.from(tlsServerCredentials.keypair.private),
            cert_chain: Buffer.from(tlsServerCredentials.certificate),
          },
        ],
        true
      );
      const clientCredentials = grpc.ChannelCredentials.createSsl(
        Buffer.from(tlsClientCredentials.rootCertificate),
        Buffer.from(tlsClientCredentials.keypair.private),
        Buffer.from(tlsClientCredentials.certificate)
      );

      server.bindAsync(`localhost:0`, serverCredentials, async (err, boundPort) => {
        if (err) {
          throw err;
        } else {
          server.start();
          const nodeClient = new NodeClient(`localhost:${boundPort}`, clientCredentials);
          const nodeRequest = new NodeMessage()
          nodeRequest.setPublicKey('some pub key')
          nodeRequest.setSubMessage('sub message')
          nodeRequest.setType(SubServiceType.GIT)
          nodeClient.messageNode(nodeRequest, (err, response) => {
            if (err) {
              expect(err).toEqual(undefined)
            } else {
              expect(response).toEqual(nodeRequest)
            }
            done()
          });
        }
      });
    })
  })

  describe('Node Forge TLS', () => {
    let tlsServerCredentials: TLSCredentials
    let tlsClientCredentials: TLSCredentials

    beforeAll(() => {
      // request certificates from CA for both kmA.pki and kmB.pki
      // ==== PEER A ==== //
      const csrA = kmA.pki.createCSR('server', 'passphrase')
      kmA.pki.importCertificate(kmCA.pki.handleCSR(csrA))
      // ==== PEER B ==== //
      const csrB = kmB.pki.createCSR('client', 'passphrase')
      kmB.pki.importCertificate(kmCA.pki.handleCSR(csrB))

      // kmA.pki will provide the server credentials and kmB.pki will provide the client credentials
      tlsServerCredentials = kmA.pki.TLSServerCredentials!
      tlsClientCredentials = kmB.pki.TLSClientCredentials!
    })

    test('node forge tls test work with custom certificates', done => {

      const end: any = {};

      let success = false;

      // create TLS client
      end.client = forge.tls.createConnection({
        server: false,
        caStore: [forge.pki.certificateFromPem(tlsServerCredentials.certificate)],
        sessionCache: {},
        // supported cipher suites in order of preference
        cipherSuites: [
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA,
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA
        ],
        virtualHost: 'server',
        verify: function (c, verified, depth, certs) {
          console.log(
            'TLS Client verifying certificate w/CN: "' +
            certs[0].subject.getField('CN').value +
            '", verified: ' + verified + '...');
          return verified;
        },
        connected: function (c) {
          console.log('Client connected...');

          // send message to server
          setTimeout(function () {
            c.prepareHeartbeatRequest('heartbeat');
            c.prepare('Hello Server');
          }, 1);
        },
        getCertificate: function (c, hint) {
          console.log('Client getting certificate ...');
          return tlsClientCredentials.certificate;
        },
        getPrivateKey: function (c, cert) {
          return tlsClientCredentials.keypair.private;
        },
        tlsDataReady: function (c) {
          // send TLS data to server
          end.server.process(c.tlsData.getBytes());
        },
        dataReady: function (c) {
          const response = c.data.getBytes();
          console.log('Client received "' + response + '"');
          success = (response === 'Hello Client');
          expect(success).toEqual(true)
          c.close();
        },
        heartbeatReceived: function (c, payload) {
          console.log('Client received heartbeat: ' + payload.getBytes());
        },
        closed: function (c) {
          expect(success).toEqual(true)
          done()
        },
        error: function (c, error) {
          console.log('Client error: ' + error.message);
        }
      });

      // create TLS server
      end.server = forge.tls.createConnection({
        server: true,
        caStore: [forge.pki.certificateFromPem(tlsClientCredentials.certificate)],
        sessionCache: {},
        // supported cipher suites in order of preference
        cipherSuites: [
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA,
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA],
        connected: function (c) {
          console.log('Server connected');
          c.prepareHeartbeatRequest('heartbeat');
        },
        verifyClient: true,
        verify: function (c, verified, depth, certs) {
          console.log(
            'Server verifying certificate w/CN: "' +
            certs[0].subject.getField('CN').value +
            '", verified: ' + verified + '...');
          return verified;
        },
        getCertificate: function (c, hint) {
          console.log('Server getting certificate for "' + hint[0] + '"...');
          return tlsServerCredentials.certificate;
        },
        getPrivateKey: function (c, cert) {
          return tlsServerCredentials.keypair.private;
        },
        tlsDataReady: function (c) {
          // send TLS data to client
          end.client.process(c.tlsData.getBytes());
        },
        dataReady: function (c) {
          console.log('Server received "' + c.data.getBytes() + '"');

          // send response
          c.prepare('Hello Client');
          c.close();
        },
        heartbeatReceived: function (c, payload) {
          console.log('Server received heartbeat: ' + payload.getBytes());
        },
        closed: function (c) {
          console.log('Server disconnected.');
        },
        error: function (c, error) {
          console.log('Server error: ' + error.message);
        }
      });

      console.log('created TLS client and server, doing handshake...');
      end.client.handshake();
    })
  })
})
