{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
pkgs.mkShell {
  nativeBuildInputs = [
    nodejs
    grpc-tools
    openapi-generator-cli
  ];
  shellHook = ''
    echo 'Entering js-polykey'
    set -o allexport
    . ./.env
    set +o allexport
    set -v

    export PATH="$(pwd)/dist/bin:$(npm bin):$PATH"
    npm install
    mkdir --parents "$(pwd)/tmp"

    # add aliases for easy development
    alias polykey='npm run polykey --'
    alias pk='polykey'

    set +v
  '';
}
