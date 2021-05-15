import * as grpc from '@grpc/grpc-js';
import { TestService, ITestServer, TestClient } from './src/proto/js/Test_grpc_pb';
import * as testPB from './src/proto/js/Test_pb';
import { promisify } from './src/utils';
import * as grpcUtils from './src/grpc/utils';
import { ErrorPolykey } from './src/errors';

const testService: ITestServer = {
  unary: async (
    call: grpc.ServerUnaryCall<testPB.EchoMessage, testPB.EchoMessage>,
    callback: grpc.sendUnaryData<testPB.EchoMessage>,
  ): Promise<void> => {
    const m = new testPB.EchoMessage();
    m.setChallenge(call.request.getChallenge());
    callback(null, m);
  },
  serverStream: async(
    stream: grpc.ServerWritableStream<testPB.EchoMessage, testPB.EchoMessage>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(stream);

    const m = new testPB.EchoMessage();
    m.setChallenge('AHHH: 1');
    await genWritable.next(m);

    m.setChallenge('AHHH: 2');
    await genWritable.next(m);

    m.setChallenge('AHHH: 3');
    await genWritable.next(m);

    m.setChallenge('AHHH: 4');
    await genWritable.next(m);

    m.setChallenge('AHHH: 5');
    await genWritable.next(m);

    m.setChallenge('AHHH: 6');
    await genWritable.next(m);

    genWritable.stream.end();
  },
  clientStream: async (
    stream: grpc.ServerReadableStream<testPB.EchoMessage, testPB.EchoMessage>,
    callback: grpc.sendUnaryData<testPB.EchoMessage>,
  ): Promise<void> => {
    const genReadable = grpcUtils.generatorReadable(stream);
    let data = '';
    try {
      for await (const m of genReadable) {
          const d = m.getChallenge();
          data += d;
      }
    } catch (err) {
      console.log('Error:', err.message);
      const response = new testPB.EchoMessage();
      callback(err, response);
    }
    const response = new testPB.EchoMessage();
    response.setChallenge(data);
    callback(null, response);
  },
  duplexStream: async (
    stream: grpc.ServerDuplexStream<testPB.EchoMessage, testPB.EchoMessage>,
  ) => {
    const genDuplex = grpcUtils.generatorDuplex(stream);

    const m = new testPB.EchoMessage();
    const response = await genDuplex.read();
    if (response === null) return;
    console.log(response.value.getChallenge());
    m.setChallenge('SERVER WFEAEW: 2');
    await genDuplex.write(m);

    genDuplex.stream.end();

  }
}

const server = new grpc.Server();
server.addService(TestService, testService);
server.bindAsync('127.0.0.1:55556', grpc.ServerCredentials.createInsecure(), () => {
  server.start();
})
console.log("PROMISIFIED SERVER STARTED")
