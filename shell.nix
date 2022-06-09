{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  utils = callPackage ./utils.nix {};
in
  mkShell {
    nativeBuildInputs = [
      nodejs
      utils.node2nix
      grpc-tools
      grpcurl
    ];
    PKG_CACHE_PATH = utils.pkgCachePath;
    PKG_IGNORE_TAG = 1;
    shellHook = ''
      echo 'Entering js-polykey'
      set -o allexport
      . ./.env
      set +o allexport
      set -v

      mkdir --parents "$(pwd)/tmp"

      # Built executables and NPM executables
      export PATH="$(pwd)/dist/bin:$(npm bin):$PATH"

      # Enables npm link to work
      export npm_config_prefix=~/.npm

      npm install --ignore-scripts

      set +v
    '';
  }
