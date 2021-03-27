// import STUNMessage from "../message/Message"
// import { STUNAttributeType } from "../message/types"
// import Server from "../server/Server"

// class ChannelBind {
//   server: Server
//   constructor(server: Server) {
//     this.server = server
//   }

//   channelBind(message: STUNMessage, reply: STUNMessage) {
//     const channelNumber = message.getAttribute(STUNAttributeType.CHANNEL_NUMBER)
//     const nodeAddress = message.getAttribute(STUNAttributeType.XOR_PEER_ADDRESS)

//     // The request contains both a CHANNEL-NUMBER and an XOR-PEER-ADDRESS attribute
//     if (!channelNumber || !nodeAddress) {
//       message.debug('TRACE', 'transactionID' + message.transactionID + ' The request MUST contains both a CHANNEL-NUMBER and an XOR-PEER-ADDRESS attribute');
//       return reply.reject(400, 'Bad Request');
//     }
//   }
// }

// export default ChannelBind
