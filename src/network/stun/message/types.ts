// const STUNMagicCookie = 0x2112A442 // (fixed for all messages)
// enum STUNAttributeType {
//   // Comprehension-required range (0x0000-0x7FFF):
//   // 0x0000: (Reserved)
//   MAPPED_ADDRESS = 0x0001,
//   // 0x0002: (Reserved; was RESPONSE-ADDRESS)
//   // 0x0003: (Reserved; was CHANGE-ADDRESS)
//   // 0x0004: (Reserved; was SOURCE-ADDRESS)
//   // 0x0005: (Reserved; was CHANGED-ADDRESS)
//   USERNAME = 0x0006,
//   // 0x0007: (Reserved; was PASSWORD)
//   MESSAGE_INTEGRITY = 0x0008,
//   ERROR_CODE = 0x0009,
//   UNKNOWN_ATTRIBUTES = 0x000A,
//   // 0x000B: (Reserved; was REFLECTED - FROM)
//   REALM = 0x0014,
//   NONCE = 0x0015,
//   XOR_MAPPED_ADDRESS = 0x0020,
//   // Comprehension-optional range (0x8000-0xFFFF):
//   SOFTWARE = 0x8022,
//   ALTERNATE_SERVER = 0x8023,
//   FINGERPRINT = 0x8028,
//   // Extensions to STUN for TURN (https://tools.ietf.org/html/rfc5766)
//   CHANNEL_NUMBER = 0x000C,
//   LIFETIME = 0x000D,
//   // 0x0010: Reserved (was BANDWIDTH)
//   XOR_PEER_ADDRESS = 0x0012,
//   DATA = 0x0013,
//   XOR_RELAYED_ADDRESS = 0x0016,
//   EVEN_PORT = 0x0018,
//   REQUESTED_TRANSPORT = 0x0019,
//   DONT_FRAGMENT = 0x001A,
//   // 0x0021: Reserved (was TIMER-VAL)
//   RESERVATION_TOKEN = 0x0022,
// }
// enum STUNMethodType {
//   // The initial STUN methods are:
//   // 0x000: (Reserved)
//   Binding = 0x001,
//   // 0x002: (Reserved; was SharedSecret)
//   // New STUN methods (https://tools.ietf.org/html/rfc5766#page-45)
//   Allocate = 0x003,         // (only request/response semantics defined)
//   Refresh = 0x004,          // (only request/response semantics defined)
//   Send = 0x006,             // (only indication semantics defined)
//   Data = 0x007,             // (only indication semantics defined)
//   CreatePermission = 0x008, // (only request/response semantics defined
//   ChannelBind = 0x009,      // (only request/response semantics defined)
// }

// // Mapped Address:
// // 0                   1                   2                   3
// // 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// // |0 0 0 0 0 0 0 0|    Family     |           Port                |
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// // |                                                               |
// // |                 Address (32 bits or 128 bits)                 |
// // |                                                               |
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// enum STUNFamily {
//   IPv4 = 0x01,
//   IPv6 = 0x02,
// }
// type STUNMappedAddress = {
//   family: STUNFamily,
//   port: number,
//   address: string
// }

// // XOR Mapped Address:
// // 0                   1                   2                   3
// // 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// // |x x x x x x x x|    Family     |         X-Port                |
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// // |                X-Address (Variable)
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// type STUNXORMappedAddress = STUNMappedAddress


// export {
//   STUNMagicCookie,
//   STUNAttributeType,
//   STUNMethodType,
//   STUNMappedAddress,
//   STUNXORMappedAddress,
// }
