{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?rev=ea5234e7073d5f44728c499192544a84244bf35a";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem ([ "x86_64-linux" "x86_64-windows" "x86_64-darwin" "aarch64-darwin" ]) (targetSystem:
    let
      pkgs = import nixpkgs { system = targetSystem; };
      shell = { ci ? false }: with pkgs; pkgs.mkShell {
        nativeBuildInputs = [
          nodejs_20
          shellcheck
          gitAndTools.gh
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
