import dgram from 'dgram';

// No other process should bebound on it?
// Binding to `::`  is the default?
// Right I'm just wondering what it is bound to if we just send
// Default is `dns.lookup`
// The signal can be used to close the socket
const socket = dgram.createSocket('udp4');

socket.on('message', (msg, rinfo) => {
  console.log(msg, rinfo);
});

socket.bind(55555, 'localhost', () => {

  const socket2 = dgram.createSocket('udp4');
  // Upon the first send, it will be bound
  // But you can send it to different places
  // But you don't have to bind it if you don't want to
  // But then it will be randomly set upon the first send and repeatedly
  socket2.bind(55551);

  socket2.send('abc', 55555, 'localhost', (e) => {

    console.log('done', e);
    socket2.send('abc', 55555, 'localhost', (e) => {
      console.log('done', e);

      socket2.send('abc', 55555, 'localhost', (e) => {
        console.log('done', e);

        // socket.close();
        // socket2.close();

      });

    });


  });

});

