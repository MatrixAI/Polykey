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
      # can add privateNode node info to publicNode
      publicNodeNodeInfo = publicNode.succeed("pk nodes get -c -b")
      privateNode1.succeed("pk nodes add -b '{}'".format(publicNodeNodeInfo))
      privateNode2.succeed("pk nodes add -b '{}'".format(publicNodeNodeInfo))
      # can add publicNode node info to privateNodes
      privateNode1NodeInfo = privateNode1.succeed("pk nodes get -c -b")
      privateNode2NodeInfo = privateNode2.succeed("pk nodes get -c -b")
      publicNode.succeed("pk nodes add -b '{}'".format(privateNode1NodeInfo))
      publicNode.succeed("pk nodes add -b '{}'".format(privateNode2NodeInfo))
      # copy public keys over to node machines
      publicNodePublicKey = publicNode.succeed("cat $HOME/.polykey/.keys/public_key")
      privateNode1PublicKey = privateNode1.succeed("cat $HOME/.polykey/.keys/public_key")
      privateNode2PublicKey = privateNode2.succeed("cat $HOME/.polykey/.keys/public_key")
      privateNode1.succeed("echo '{}' > $HOME/publicNode.pub".format(publicNodePublicKey))
      privateNode1.succeed("echo '{}' > $HOME/privateNode2.pub".format(privateNode2PublicKey))
      privateNode2.succeed("echo '{}' > $HOME/publicNode.pub".format(publicNodePublicKey))
      privateNode2.succeed("echo '{}' > $HOME/privateNode1.pub".format(privateNode1PublicKey))
      publicNode.succeed("echo '{}' > $HOME/privateNode1.pub".format(privateNode1PublicKey))
      publicNode.succeed("echo '{}' > $HOME/privateNode2.pub".format(privateNode2PublicKey))
      # modify node info to match node machines' host address
      publicNode.succeed("pk nodes update -p $HOME/privateNode1.pub -ch privateNode1")
      publicNode.succeed("pk nodes update -p $HOME/privateNode2.pub -ch privateNode2")
      privateNode1.succeed(
          "pk nodes update -p $HOME/publicNode.pub -ch publicNode -r $HOME/publicNode.pub"
      )
      privateNode2.succeed(
          "pk nodes update -p $HOME/publicNode.pub -ch publicNode -r $HOME/publicNode.pub"
      )
      # privateNodes can ping publicNode
      privateNode1.succeed("pk nodes ping -p $HOME/publicNode.pub")
      privateNode2.succeed("pk nodes ping -p $HOME/publicNode.pub")
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
      privateNode1.succeed("pk nodes relay -p $HOME/publicNode.pub")
      # add privateNode1 node info to privateNode2
      privateNode1NodeInfo = privateNode1.succeed("pk nodes get -c -b")
      privateNode2.succeed("pk nodes add -b '{}'".format(privateNode1NodeInfo))
      # add privateNode2 node info to privateNode1
      privateNode2NodeInfo = privateNode2.succeed("pk nodes get -c -b")
      privateNode1.succeed("pk nodes add -b '{}'".format(privateNode2NodeInfo))
      # can ping privateNode1 to privateNode2
      privateNode2.succeed("pk nodes ping -p ~/privateNode1.pub")
      # can pull a vault from privateNode1 to privateNode2
      privateNode2.succeed("pk vaults clone -p ~/privateNode1.pub -n privateVault1")
    '';
  }
