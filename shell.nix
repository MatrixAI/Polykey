{
  pkgs ? import (fetchTarball https://github.com/NixOS/nixpkgs-channels/archive/00e56fbbee06088bf3bf82169032f5f5778588b7.tar.gz) {}
}:
  with pkgs;
  stdenv.mkDerivation {
    name = "js-polykey";
    buildInputs = [ python2 nodejs-8_x flow ];
  }
