import * as grpc from '@grpc/grpc-js';
import {
  TestService,
  ITestServer,
  TestClient,
} from './src/proto/js/Test_grpc_pb';
import * as testPB from './src/proto/js/Test_pb';
import { promisify } from './src/utils';
import * as grpcUtils from './src/grpc/utils';
import { ErrorPolykey } from './src/errors';

async function run() {
  const client = new TestClient(
    '127.0.0.1:55556',
    grpc.ChannelCredentials.createInsecure(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  console.log('PROMISFIED CLIENT STARTED');

  // SERVER STREAMING CALL
  console.log('SERVER STREAMING:\n');

  const m = new testPB.EchoMessage();
  m.setChallenge('FFFFFFF');

  const readableStream = grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
    client,
    client.serverStream,
  );

  const generator = readableStream(m);
  try {
    for await (const thing of generator) {
      console.log(thing.getChallenge());
    }
  } catch (err) {
    console.log('ERROR', err.message);
  }

  // CLIENT STREAMING
  console.log('CLIENT STREAMING:\n');

  const writableStream = grpcUtils.promisifyWritableStreamCall<
    testPB.EchoMessage,
    testPB.EchoMessage
  >(client, client.clientStream);

  const [genStream, res] = writableStream();

  m.setChallenge('CLIAAAAH: 1');
  await genStream.next(m);

  m.setChallenge('CLIAAAAH: 2');
  await genStream.next(m);

  m.setChallenge('CLIAAAAH: 3');
  await genStream.next(m);

  m.setChallenge('CLIAAAAH: 4');
  await genStream.next(m);

  m.setChallenge('CLIAAAAH: 5');
  await genStream.next(m);

  genStream.stream.end();

  const response = await res;
  console.log(response.getChallenge());

  // DUPLEX STREAMING
  console.log('DUPLEX STREAMING\n');
  const duplexStream = grpcUtils.promisifyDuplexStreamCall<
    testPB.EchoMessage,
    testPB.EchoMessage
  >(client, client.duplexStream);

  const genDuplex = duplexStream();

  const m1 = new testPB.EchoMessage();
  m1.setChallenge('Client SEFAE: 1');
  await genDuplex.write(m1);
  const serverResponse = await genDuplex.read();
  if (serverResponse === null) return;
  console.log(serverResponse.value.getChallenge());

  genDuplex.stream.end();

}

run();
