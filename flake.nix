{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";

    nixpkgs-matrix.url = "github:matrixai/nixpkgs-matrix";
    nixpkgs.follows = "nixpkgs-matrix/nixpkgs";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachSystem ([
      "x86_64-linux"
      "x86_64-windows"
      "x86_64-darwin"
      "aarch64-darwin"
    ]) (system:
      let
        pkgs = import nixpkgs {
          system = system;
        };

        shell = { ci ? false }: with pkgs; pkgs.mkShell {
          nativeBuildInputs = [
            nodejs_20
            shellcheck
            jq
          ];
          # Don't set rpath for native addons
          NIX_DONT_SET_RPATH = true;
          NIX_NO_SELF_RPATH = true;
          RUST_SRC_PATH = "${rustPlatform.rustLibSrc}";
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
        };
      in
        {
          devShells = {
            default = shell { ci = false; };
            ci = shell { ci = true; };
          };
        }
      );
}
