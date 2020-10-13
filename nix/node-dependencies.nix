{ pkgs ? import <nixpkgs> { inherit system; }
, system ? builtins.currentSystem
, polykey-src ? ../.
}:

with pkgs;

let
  nodePackages = import ./generated/node-composition.nix {
    inherit system;
    nodejs = nodejs-12_x;
    pkgs = {
      inherit fetchurl fetchgit;
      inherit stdenv python2 utillinux runCommand writeTextFile;
      inherit darwin;
    };
  };

  buildInputs = [] ++ stdenv.lib.optionals stdenv.isDarwin [
    xcbuild darwin.DarwinTools
    darwin.apple_sdk.frameworks.CoreServices
  ];


  # As we're only interested by the dependencies (at the point)
  # we keep only the package and packaeg lock files. This
  # will allow us to edit the sources without our dev environment
  # being rebuilt each time.
  srcFilter = inSrc: lib.sources.sourceByRegex inSrc [
      "^package-lock.json$"
      "^package.json$"
    ];

  filteredSrc =
    if lib.isStorePath polykey-src
      # This is already a store path.
      # Prevent the "cannot refer to other path" error by avoiding
      # the filter. This is most likely a fetcher's output.
      then polykey-src
      else srcFilter polykey-src;
in

nodePackages // {
  package = nodePackages.package.override {
    src = filteredSrc;
    inherit buildInputs;
    # dontNpmInstall = true;
  };

  shell = nodePackages.shell.override {
    src = filteredSrc;
    inherit buildInputs preRebuild;
    dontNpmInstall = true;
  };
}
