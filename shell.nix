{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  utils = callPackage ./utils.nix {};
in
  pkgs.mkShell {
    nativeBuildInputs = [
      nodejs
      nodePackages.node2nix
      grpc-tools
      grpcurl
      utils.pkg
    ];
    PKG_CACHE_PATH = utils.pkgCachePath;
    PKG_IGNORE_TAG = 1;
    shellHook = ''
      echo 'Entering js-polykey'
      set -o allexport
      . ./.env
      set +o allexport
      set -v

      export PATH="$(pwd)/dist/bin:$(npm bin):$PATH"

      # pkg is installed in package.json
      # this ensures that in nix-shell we are using the nix packaged versions
      export PATH="${lib.makeBinPath
        [
          utils.pkg
        ]
      }:$PATH"

      npm install
      mkdir --parents "$(pwd)/tmp"

      set +v
    '';
  }
