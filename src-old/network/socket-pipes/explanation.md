1: direct connection (might work)

2 phases of nat traversal:
2: hole punching (might work)
3: relaying (will work)
2^32 ports 65525

wants:
nodeA --> nodeB

if relayed:
nodeA -1-> publicNode (bootstrap node) -2-> nodeB

-1-> = TCP (gRPC client) to MTP connection
-2-> = MTP to TCP (gRPC server) connection

NAT representation:
you   NAT   Internet
|1     |1    |1
|2     |2    |2
|3     |3    |3


setup at the moment is that publicNode relays a TCP address which other clients can directly connect to via NodeClient (gRPC client)
this is for simplicity in the code, but does not work for hole punching

hole punching process:
1: nodeB asks publicNode to determine its hole punched address (which will later be advertised to other connecting nodes) (called "Binding" in STUN protocol)
  1a: mud hole punching (2 endpoints only) 1->2->1 (sets the port mapping)
2: nodeA asks publicNode to connect it to nodeB:
  2a: publicNode uses "mud hole punched" connection to tell nodeB that nodeA is trying to connect
  2b: publicNode tells nodeA to send its handshake packets to nodeBs "mud hole punched" address
  2c: publicNode also tells nodeB to send its handshake packets to nodeAs connecting address (the address that nodeA used to connect to publicNode)
  NOTE: nodes A and B need to send packets to each other to tell the NAT layer to accept incoming packets from that same address
  2d: if nodes are both behind the correct NAT types, this will mean hole punching succeeds and the publicNode is no longer needed

If hole punching fails (i.e. no connection after a specified timeout) the publicNode will set up a relay:

relaying process:
1: nodeB asks publicNode to relay its gRPC server
  1a: mud hole punching (2 endpoints only) 1->2->1 (sets the port mapping)
  1b: publicNode has to allocate a public port for nodeBs gRPC server!
  1c: nodeBs gRPC server to publicNode by using a TCPToMTPSocketPipe
  1d: in the end, this means nodeBs gRPC server is now served on public port on the publicNodes network!
2: nodeA wants to connect to nodeBs gRPC server:
  2a: publicNode tells nodeA of nodeBs public address via DHT
  2b: therefore this address can be used when initializing the NodeClient (gRPC client)



NAT types:
- 4 nat types: https://en.wikipedia.org/wiki/Network_address_translation#Methods_of_translation

