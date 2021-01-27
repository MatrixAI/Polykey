# here is the testing base file: https://github.com/NixOS/nixpkgs/blob/master/nixos/lib/testing-python.nix
with import ../../pkgs.nix {};
let
  pk = (callPackage ../../nix/default.nix {}).package;
in
  import <nixpkgs/nixos/tests/make-test-python.nix> {
    nodes =
      {
        privateNode1 =
          { nodes, pkgs, ... }:
          {
            virtualisation.vlans = [ 1 ];
            environment.variables = {
              PK_PATH = "$HOME/.polykey";
            };
            environment.systemPackages = [ pk pkgs.tcpdump ];
            networking.firewall.enable = false;
            networking.defaultGateway = (pkgs.lib.head nodes.router1.config.networking.interfaces.eth1.ipv4.addresses).address;
          };
        privateNode2 =
          { nodes, pkgs, ... }:
          {
            virtualisation.vlans = [ 2 ];
            environment.variables = {
              PK_PATH = "$HOME/.polykey";
            };
            environment.systemPackages = [ pk pkgs.tcpdump ];
            networking.firewall.enable = false;
            networking.defaultGateway = (pkgs.lib.head nodes.router2.config.networking.interfaces.eth1.ipv4.addresses).address;
          };
        router1 =
          { pkgs, ... }:
          {
            virtualisation.vlans = [ 1 3 ];
            environment.systemPackages = [ pkgs.tcpdump ];
            networking.firewall.enable = false;
            networking.nat.externalInterface = "eth2";
            networking.nat.internalIPs = [ "192.168.1.0/24" ];
            networking.nat.enable = true;
          };
        router2 =
          { ... }:
          {
            virtualisation.vlans = [ 2 3 ];
            environment.systemPackages = [ pkgs.tcpdump ];
            networking.firewall.enable = false;
            networking.nat.externalInterface = "eth2";
            networking.nat.internalIPs = [ "192.168.2.0/24" ];
            networking.nat.enable = true;
          };
        publicNode =
          { config, pkgs, ... }:
          {
            virtualisation.vlans = [ 3 ];
            environment.variables = {
              PK_PATH = "$HOME/.polykey";
            };
            environment.systemPackages = [ pk pkgs.tcpdump ];
            networking.firewall.enable = false;
          };
      };
    testScript =''
      start_all()
      # can start polykey-agent in both public and private nodes
      publicNode.succeed("pk agent start")
      privateNode1.succeed("pk agent start")
      privateNode2.succeed("pk agent start")
      # can create a new keynode in both public and private nodes
      create_node_command = "pk agent create -n {name} -e {name}@email.com -p passphrase"
      publicNode.succeed(create_node_command.format(name="publicNode"))
      privateNode1.succeed(create_node_command.format(name="privateNode1"))
      privateNode2.succeed(create_node_command.format(name="privateNode2"))
      # can add privateNode peer info to publicNode
      publicNodePeerInfo = publicNode.succeed("pk peers get -c -b")
      privateNode1.succeed("pk peers add -b '{}'".format(publicNodePeerInfo))
      privateNode2.succeed("pk peers add -b '{}'".format(publicNodePeerInfo))
      # can add publicNode peer info to privateNodes
      privateNode1PeerInfo = privateNode1.succeed("pk peers get -c -b")
      privateNode2PeerInfo = privateNode2.succeed("pk peers get -c -b")
      publicNode.succeed("pk peers add -b '{}'".format(privateNode1PeerInfo))
      publicNode.succeed("pk peers add -b '{}'".format(privateNode2PeerInfo))
      # copy public keys over to peer machines
      publicNodePublicKey = publicNode.succeed("cat $HOME/.polykey/.keys/public_key")
      privateNode1PublicKey = privateNode1.succeed("cat $HOME/.polykey/.keys/public_key")
      privateNode2PublicKey = privateNode2.succeed("cat $HOME/.polykey/.keys/public_key")
      privateNode1.succeed("echo '{}' > $HOME/publicNode.pub".format(publicNodePublicKey))
      privateNode1.succeed("echo '{}' > $HOME/privateNode2.pub".format(privateNode2PublicKey))
      privateNode2.succeed("echo '{}' > $HOME/publicNode.pub".format(publicNodePublicKey))
      privateNode2.succeed("echo '{}' > $HOME/privateNode1.pub".format(privateNode1PublicKey))
      publicNode.succeed("echo '{}' > $HOME/privateNode1.pub".format(privateNode1PublicKey))
      publicNode.succeed("echo '{}' > $HOME/privateNode2.pub".format(privateNode2PublicKey))
      # modify peer info to match peer machines' host address
      publicNode.succeed("pk peers update -p $HOME/privateNode1.pub -ch privateNode1")
      publicNode.succeed("pk peers update -p $HOME/privateNode2.pub -ch privateNode2")
      privateNode1.succeed(
          "pk peers update -p $HOME/publicNode.pub -ch publicNode -r $HOME/publicNode.pub"
      )
      privateNode2.succeed(
          "pk peers update -p $HOME/publicNode.pub -ch publicNode -r $HOME/publicNode.pub"
      )
      # privateNodes can ping publicNode
      privateNode1.succeed("pk peers ping -p $HOME/publicNode.pub")
      privateNode2.succeed("pk peers ping -p $HOME/publicNode.pub")
      # can create a new vault in publicNode and clone it from both privateNodes
      publicNode.succeed("pk vaults new publicVault")
      publicNode.succeed("echo 'secret content' > $HOME/secret")
      publicNode.succeed("pk secrets new publicVault:Secret -f $HOME/secret")
      privateNode1.succeed("pk vaults clone -n publicVault -p $HOME/publicNode.pub")
      privateNode2.succeed("pk vaults clone -n publicVault -p $HOME/publicNode.pub")
      # can create a new vault in privateNode1
      privateNode1.succeed("pk vaults new privateVault1")
      # can create a new secret in privateNode1
      privateNode1.succeed("echo 'secret content' > $HOME/secret")
      privateNode1.succeed("pk secrets new privateVault1:Secret -f $HOME/secret")
      # setup a relay between privateNode1 and publicNode
      privateNode1.succeed("pk peers relay -p $HOME/publicNode.pub")
      # add privateNode1 peer info to privateNode2
      privateNode1PeerInfo = privateNode1.succeed("pk peers get -c -b")
      privateNode2.succeed("pk peers add -b '{}'".format(privateNode1PeerInfo))
      # add privateNode2 peer info to privateNode1
      privateNode2PeerInfo = privateNode2.succeed("pk peers get -c -b")
      privateNode1.succeed("pk peers add -b '{}'".format(privateNode2PeerInfo))
      # can ping privateNode1 to privateNode2
      privateNode2.succeed("pk peers ping -p ~/privateNode1.pub")
      # can pull a vault from privateNode1 to privateNode2
      privateNode2.succeed("pk vaults clone -p ~/privateNode1.pub -n privateVault1")
    '';
  }
