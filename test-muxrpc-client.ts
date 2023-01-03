import MRPC from 'muxrpc';
import pull from 'pull-stream';
import toPull from 'stream-to-pull-stream';
import net from 'net';
import { sleep } from './src/utils';

const manifest = {
  hello: 'async',
  // another: 'async',
  stuff: 'source',

  sink: 'sink',

  duplex: 'duplex',
};

// Client needs the remote manifest, it can pass a local manifest, and then a local API

// Remote manifest, local manifest, codec
// Local API, Permissions, ID
const client = MRPC(manifest, null)(null, null, 'CLIENT');

console.log(client);

const stream = toPull.duplex(net.connect(8080));

// const onClose = () => {
//   console.log('closed connection to muxrpc server');
// };


const mStream = client.createStream();

// This also takes a duplex socket, and converts it to a "pull-stream"
pull(stream, mStream, stream);

// So now that the client is composed there
// Also interestingly... notice that the TCP socket above does its own establishment
// The RPC hence is "transport" agnostic because it works on anything that is a duplex stream
// That's pretty good

client.hello('world', 100, (err, data) => {
  if (err != null) throw err;
  console.log('HELLO call1', data);
});

// Oh cool, it does support promises on the client side

// client.hello('world', 50, (err, data) => {
//   if (err != null) throw err;
//   console.log('HELLO call2', data);
// });

// client.hello('world', 10, (err, data) => {
//   if (err != null) throw err;
//   console.log('HELLO call3', data);
// });

// Yep there's a muxing of the RPC calls here
// This makes alot of sense

// No deadline... it's not finished
// Ok then there's a failure, we have 1 stream per rpc
// client.another('another').then((data) => {
//   console.log('ANOTHER', data);
// });

console.log('SENT all hellos over');

// Now if you want to do a stream, it seems `pull.values` ultimately returns some sort of stream object

// const s = client.stuff();
// // Yea this becomes a "source" stream
// // So it is infact the same type
// console.log('stuff stream', s);

// pull(s, pull.drain(console.log));

// So how does this actually "mux" the RPC calls?
// Can they be concurrent?
// I think the muxing still has to end up
// interleaving the data...
// So it's still in sequence
// But the order can be different depending on the situation


// This is a sink
// we need to feed datat to the seek
// How do we know when things are done...?
// client.sink(
//   pull.values(['hello', 'world']),
//   (e, v) => {
//     console.log('got it', v);
//   }
// );

// const sink = client.sink();

// pull(
//   pull.values(['hello', 'world']),
//   sink
// );

// When a "stream" is opened here
// it prevents the process from shutting down
// That's kind of bad
// We don't really want to keep the process open

// const duplex = client.duplex();

// console.log('DUPLEX', duplex);

// pull(
//   pull.values([1, 2, 3, 'end']),
//   duplex,
//   pull.drain(console.log)
// );

// Nothing is "ending" the stream
// that's the problem

// console.log('YO');


// The entire MUXRPC object is an event emitter

// console.log(client.id);

console.log(mStream);

// This is also asynchronous
// It ends up closing a "ws"
// Which usese `initStream`
// YOU HAVE TO SUPPLY A CALLBACK
// client.end();

console.log('is open', mStream.isOpen());

// I think this is actually wht is perfomring a remote call
// whatever...
// console.log('remote call', mStream.remoteCall.toString());

mStream.close(() => {
  console.log('CLOSING MUXRPC STREAM');

  // Closing the stream also closes the client
  // The client can create a stream...
  // That's really strange
  // Ok but the client is then closed too?
  console.log(client.closed);
});



// client.close(() => {
//   console.log('ClOSED');
// });

// Remember TCP sockets are duplex streams
// So they are already duplex concurrently
// They are also event emitters at the same time

// But dgram sockets are EventEmitters
// They are not Duplex stream
// They are not streams at all
// Which makes sense
// But as an event emitter, that makes them concurrent in both directions too
// Messages could be sent there and also received
// All UDP datagrams can be sent to alternative destinations, even if bound to the same socket

// So this is very interesting

// I'm still seeing a problem.
// How does the handlers get context of the RPC call? And how does it get access to the remote side's manifest?


