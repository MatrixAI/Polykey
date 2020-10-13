# Adapted from https://github.com/NixOS/nixpkgs/pull/86169/commits/5e1cf2dbc31ad4fffa3e019b33f696da76eefcbe
{ pkgs ? import ../pkgs.nix {} }:

with pkgs;
let

in

stdenv.mkDerivation rec {
  pname = "polykey-cli";
  version = "0.0.17";
  name = "${pname}-${version}";

  nativeBuildInputs = [
    makeWrapper
    nodejs
    nodejs-12_x
    nodePackages.node2nix
  ];

  buildInputs = [
    nodejs
    nodejs-12_x
    nodePackages.node2nix
  ];

  src = ../.;

  nodeDependencies = (import ./node-dependencies.nix {
    inherit system;
    inherit pkgs;
    # pkgs = args // {  };
    polykey-src = src;
  }).package;

  buildPhase = ''
    ln -s ${nodeDependencies}/lib/node_modules ./node_modules
    export PATH="${nodeDependencies}/bin:$PATH"
    export PATH="$(pwd)/dist/bin:$(npm bin):$PATH"

    cd ${src}
    ls
    npm run build:webpack
    npm run build:all
    cp -r dist $out/
  '';

  installPhase = ''
    # Linux only.
    mkdir -p "$out/bin"
    # For exposing the polykey cli
    declare target="$(readlink -f "$out/lib/node_modules")"
    ln -s -T "${nodeDependencies}/bin/polykey" "$out/bin/pk"
    ln -s -T "${nodeDependencies}/bin/polykey" "$out/bin/polykey-cli"
  '';
}
