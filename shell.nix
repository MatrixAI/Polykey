{ pkgs ? import ./pkgs.nix {}, ci ? false }:

with pkgs;
let
  utils = callPackage ./utils.nix {};
in
  mkShell {
    nativeBuildInputs = [
      utils.nodejs
      shellcheck
      grpc-tools
      grpcurl
      gitAndTools.gh
      awscli2
      skopeo
      jq
    ];
    PKG_CACHE_PATH = utils.pkgCachePath;
    PKG_IGNORE_TAG = 1;
    shellHook = ''
      echo "Entering $(npm pkg get name)"
      set -o allexport
      . ./.env
      set +o allexport
      set -v
      ${
        lib.optionalString ci
        ''
        set -o errexit
        set -o nounset
        set -o pipefail
        shopt -s inherit_errexit
        ''
      }
      mkdir --parents "$(pwd)/tmp"

      # Built executables and NPM executables
      export PATH="$(pwd)/dist/bin:$(npm root)/.bin:$PATH"

      npm install --ignore-scripts

      set +v
    '';
  }
