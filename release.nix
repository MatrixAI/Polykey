{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
rec {
  application = callPackage ./default.nix {};
  docker = dockerTools.buildImage {
    name = application.name;
    contents = [ application nodejs nsswitch cacert ];
    keepContentsDirlinks = true;
    extraCommands = ''
      mkdir -m 1777 tmp
    '';
    config = {
      Entrypoint = [ "/bin/polykey" ];
      Cmd = ["agent" "init" "-ui" "polykey-relay" "-pp" "polykey-relay" ];
    };
  };
  nsswitch = writeTextDir "etc/nsswitch.conf"
    ''
    hosts:     files dns myhostname
    '';
}
