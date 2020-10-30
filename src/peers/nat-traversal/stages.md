the first stage is having both clients connect to a known intermediary peer via udp. So this would require there being a MTP relay server and that the public node can retransmit connection requests back to that MTP address

1) create a direct hole punch with every peer and keep it alive:
- send peer your udp address via tcp
- it will respond with its udp address
- you will send a ping packet with public key attached to peers' udp address
- peer will receive that packet and open a connection back through the address it saw and store it as an open connection against your public key
- peer will send back ping message confirming connection and you will store that socket as
