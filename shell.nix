{ pkgs ? import ./pkgs.nix {}, ci ? false }:

with pkgs;
mkShell {
  nativeBuildInputs = [
    nodejs
    shellcheck
    gitAndTools.gh
    jq
  ];
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
