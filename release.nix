{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  nsswitch = writeTextDir "etc/nsswitch.conf"
    ''
    hosts:     files dns myhostname
    '';

in
rec {
  application = callPackage ./default.nix {};
  docker = dockerTools.buildImage {
    name = application.name;
    contents = [ application nsswitch cacert ];
    keepContentsDirlinks = true;
    extraCommands = ''
      mkdir -m 1777 tmp
    '';
    config = {
      Entrypoint = [ "/bin/polykey" ];
      Cmd = [ "agent" "init" "-ui" "polykey-relay" "-pp" "polykey-relay" ];
      Env = [
        "PK_PEER_HOST=0.0.0.0"
        "PK_PEER_PORT=1314"
        "PK_API_PORT=1315"
      ];
      ExposedPorts = {
        "1314/tcp" = {};
        "1314/udp" = {};
        "1315/tcp" = {};
      };
    };
  };
  nsswitch = writeTextDir "etc/nsswitch.conf"
    ''
    hosts:     files dns myhostname
    '';
}
