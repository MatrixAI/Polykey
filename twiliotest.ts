import http from 'http'
import Twilio from 'twilio'
import IO from 'socket.io'
const server = http.createServer();
const io = IO(server);

var twilio = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

server.listen(3000, () => {
  console.log('listening');

})
