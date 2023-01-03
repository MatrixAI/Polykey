import MRPC from 'muxrpc';
import pull from 'pull-stream';
import toPull from 'stream-to-pull-stream';
import net from 'net';
import pushable from 'pull-pushable';
import { sleep } from './src/utils';

// "dynamic" manifest

const manifest = {
  hello: 'async',
  // another: 'async',
  stuff: 'source',

  // There's also `sink` streams
  sink: 'sink',

  duplex: 'duplex',
};

// actual handlers, notice no promise support
const api = {
  async hello(name, time, cb) {
    // How are we supposed to know who contacted us?
    // This is kind of stupid

    await sleep(time);
    cb(null, 'hello' + name + '!');
  },
  // async another (name) {
  //   return 'hello' + name;
  // },
  stuff() {
    const s = pull.values([1,2,3,4,5]);

    // Yes, a "source" is a function
    // This is a function
    // Remember the "stream" is already mutated
    // But this ends up returning a function
    // This function basically starts the source
    // The `cb` is used to read the data
    // The cb gets called and it receives the data from the source
    // That's where things get a bit complicated
    // So the type of this is complex
    // console.log('is this a source', s.toString());

    // IT RETURNS THE SOURCE STREAM
    return s;
  },
  sink() {
    // Cause it is a sink, it only takes data
    // It does not give you back any confirmation back?
    // IT RETURNS the sink stream... think about that
    return pull.collect(
      (e, arr) => {
        console.log('SUNK', arr);
      }
    );
  },
  duplex() {

    // This needs to return a source and sink together
    // Parameters are still passable into it at the beginning
    // Sort of like how our duplex streams are structured
    // We are able to pass it the initial message

    // The source cannot be `pull.values`
    // Because it ends the stream
    // That seems kind of wrong

    const p = pushable();
    // for (let i = 0; i < 5; i++) {
    //   p.push(i);
    // }
    // But this seems difficult to use
    // How do we "consume" things, and then simultaneously
    // push things to the source?

    return {
      source: p,
      sink: pull.drain((value) => {
        // Wait I'm confused, how does this mean it ends?
        // How do I know when this is ended?

        // If the `p` doesn't end
        // We end up with a problem

        if (value === 'end') {
          p.end();
        }

        p.push(value + 1);
      })
    };
  },
};

// Remote manifest, local manifest, codec
// Local API, Permissions, ID
const server = MRPC(null, manifest)(api, null, 'SERVER');

console.log(server);

const muxStream = server.createStream();

net.createServer(socket => {

  console.log('NEW CONNECTION');

  // The socket is converted to a duplex pull-stream
  // Stream to Pull Stream is a conversion utility
  // Converts NodeJS streams (classic-stream and new-stream) into a pull-stream
  // It returns an object structure { source, sink }
  // It is source(stream) and sink(stream, cb)
  // The source will attach handlers on the `data`, `end`, `close`, and `error` events
  // It pushes the stream data into the a buffers list.
  // It also switches the stream to `rsume`, so it may be paused
  // If the length exists, and the stream is pausable, then it will end up calling `stream.pause()`
  // So upon handling a single `data` event, it will end up pausing the stream
  // The idea being is that the buffer will have data
  // Ok I get the idea...
  // If the buffer still has data even after calling `drain`, then that means there's already data queued up
  // That's why it pauses the stream
  // If a stream is paused, data events will not be emitted
  // The drawin runs a loop as long as there's data in the queue or ended, and the cbs is filled
  // The dbs are callbacks, it shifts one of them, and applies it to a chunk of data
  // Then it will check if the length is empty, and it is paused, it will then unpause it, and resume the stream
  // On the write side, it is attaching handlers to the stream as well
  // This time on close, finish and error.
  // On the next tick ,it is then calling the `read` function
  // Because it has to "read" a data from the source
  // This callback then is given the data
  // The data is written with `stream.write(data)`
  // Anyway the point is that these is object of 2 things
  // { source, sink }
  const stream = toPull.duplex(socket);

  // This connects the output (source) of the stream to the muxrpc stream
  // And it connects the output of the muxRPC stream to the net stream
  // This is variadic function, it can take multiple things that are streams
  // It pulls from left to right
  // So the stream source is pulled into the muxrpc stream and then pulled into the stream again
  // NET SOCKET SOURCE -> MUXRPC -> NET SOCKET SINK
  // The duplex socket is being broken apart into 2 separate streams
  // Then they get composed with the input and output of the muxrpc stream
  // And therefore muxrpc is capable multiplexing its internal messages on top of the base socket streams


  pull(stream, muxStream, stream);

  // every time a new connection occurs
  // we have to do something different...
  // I think... otherwise the streams get screwed up
  // But I'm not entirely sure
  // How do we do this over and over
  // We have to "disconnect"

  socket.on('close', () => {
    console.log('SOCKET CLOSED');
    // muxStream.close();
  });

  socket.on('end', () => {
    console.log('SOCKET ENDED');
  });


}).listen(8080);

// In a way, this pull-stream is kind of similar to the idea behind rxjs
// But it's very stream heavy, lack of typescript... etc
// Also being a pull stream, it only pulls from the source when it needs to
// I'm not sure what actually triggers it, it seems the source is given a "read" function
// So when the sink is ready, it ends up calling the `read` function

// The looper is used for "asynchronous" looping
// Because it uses the `next` call to cycle
// This is necessary in asynchronous callbacks
// However this is not necessary if we are using async await syntax
// In a callback situation you cannot just use `while() { ... }` loop
// But you casn when using async await
// I'm confused about the `function (next) { .. }` cause the looper is not passing
// anything into the `next` parameter, so that doesn't make sense
// Right it is using the 3.0.0 of looper, which had a different design
// Ok so the point is, it's a process next tick, with an asynchronous infinite loop
// The loop repeatedly calls `read` upon finishing the `write` callback
// And it will do this until the read callback is ended
// Or if the output stream itself is ended
// This is what gives it a natural form of backpressure
// It will only "pull" something as fast as the sink can take it
// Since it only triggers a pull, when the sink is drained

// An async iterator/iterator can do the same thing
// And thus one can "next" it as fast as the sink can read

// Similarly a push stream would be subscribing, but it's possible to backpressure this with
// buffers or with dropping systems... naturally buffers should be used, and the application can drop data

// This is an old structure, and I prefer modern JS with functional concepts

// Now that the server is listening, we can create the client
