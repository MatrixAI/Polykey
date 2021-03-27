{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
pkgs.mkShell {
  nativeBuildInputs = [
    nodejs
    nodePackages.node2nix
    nodePackages.node-gyp
    python3
    grpc-tools
    openapi-generator-cli
    grpcurl
  ];
  shellHook = ''
    echo 'Entering js-polykey'
    set -o allexport
    . ./.env
    set +o allexport
    set -v

    export PATH="$(pwd)/dist/bin:$(npm bin):$PATH"

    export PATH="${lib.makeBinPath
      [
        nodePackages.node-gyp
      ]
    }:$PATH"

    npm install
    mkdir --parents "$(pwd)/tmp"

    set +v
  '';
}
