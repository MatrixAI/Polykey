{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  utils = callPackage ./utils.nix {};
in
  pkgs.mkShell {
    nativeBuildInputs = [
      nodejs
      nodePackages.node2nix
      utils.pkg
      python3
      grpc-tools
      grpcurl
    ];
    PKG_CACHE_PATH = utils.pkgCachePath;
    PKG_IGNORE_TAG = 1;
    # ensure that native modules are built from source
    npm_config_build_from_source = "true";
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
