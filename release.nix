{
  pkgs ? import ./pkgs.nix
}:

with pkgs;
rec {
  application = callPackage ./default.nix {};
}
