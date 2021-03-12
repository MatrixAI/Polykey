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
        Cmd = [ "/bin/polykey" ];
      };
    };
  }
