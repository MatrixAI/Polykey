{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
rec {
  application = callPackage ./default.nix {};
  docker = dockerTools.buildImage {
    name = application.name;
    contents = [ application ];
    keepContentsDirlinks = true;
    extraCommands = ''
      mkdir -m 1777 tmp
    '';
    config = {
      Cmd = [ "/bin/polykey" ];
    };
  };
}
