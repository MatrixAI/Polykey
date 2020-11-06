# Adapted from https://github.com/NixOS/nixpkgs/pull/86169/commits/5e1cf2dbc31ad4fffa3e019b33f696da76eefcbe
{ pkgs ? import ../pkgs.nix {} }:

with pkgs;
stdenv.mkDerivation rec {
  pname = "polykey-cli";
  version = "0.0.20";
  name = "${pname}-${version}";

  nativeBuildInputs = [
    makeWrapper
    nodejs-12_x
  ];

  src = nix-gitignore.gitignoreSource [] ../.;

  nodeDependencies = (import ./node-dependencies.nix {
    inherit system pkgs;
    nodejs = nodejs-12_x;
    polykey-src = src;
  }).package;

  buildPhase = ''
    dev_node_modules="${nodeDependencies}/lib/node_modules/@matrixai/polykey/node_modules";
    ln -s -T "$dev_node_modules" "./node_modules"

    npm run build:webpack
  '';

  installPhase = ''
    mkdir $out
    cp -r bin $out
    cp -r dist $out
    cp -r proto $out
    cp package.json $out
    cp openapi.yaml $out

    wrapProgram "$out/bin/polykey" \
      --set PATH ${lib.makeBinPath [
        nodejs-12_x
      ]}

    ln -s -T "$dev_node_modules" "$out/node_modules"

    ln -s -T "$out/bin/polykey" "$out/bin/pk"
    ln -s -T "$out/bin/polykey" "$out/bin/polykey-cli"
  '';
}
