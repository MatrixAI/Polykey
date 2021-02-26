{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  # allow resolution of localhost
  nsswitch = writeTextDir "etc/nsswitch.conf"
    ''
    hosts: files dns myhostname
    '';
in
rec {
  application = callPackage ./default.nix {};
  docker = dockerTools.buildImage {
    name = application.name;
    contents = [ application cacert nsswitch ];
    keepContentsDirlinks = true;
    extraCommands = ''
      mkdir -m 1777 tmp
    '';
    config = {
      Entrypoint = [ "/bin/polykey" ];
      Cmd = [ "agent" "init" "-ui" "polykey-relay" "-pp" "polykey-relay" ];
      Env = [
        "PK_PEER_HOST=0.0.0.0"
        "PK_PEER_PORT_TCP=1314"
        "PK_PEER_PORT_UDP=1315"
        "PK_API_PORT=1316"
      ];
      ExposedPorts = {
        "1314/tcp" = {};
        "1315/udp" = {};
        "1316/tcp" = {};
      };
    };
  };
}
