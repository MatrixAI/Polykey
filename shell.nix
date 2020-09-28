{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  drv = callPackage ./default.nix {};
  nodeVersion = builtins.elemAt (lib.versions.splitVersion drv.nodejs.version) 0;
in
  drv.overrideAttrs (attrs: {
    src = null;
    nativeBuildInputs = [
      step-cli
      swagger-codegen
      nodePackages.node2nix
    ] ++ (lib.attrByPath [ "nativeBuildInputs" ] [] attrs);
    shellHook = ''
      echo 'Entering ${attrs.name}'
      set -o allexport
      . ./.env
      set +o allexport
      set -v

      export PATH="$(pwd)/dist/bin:$(npm bin):$PATH"

      npm install
      node2nix \
        --input package.json \
        --lock package-lock.json \
        --node-env ./nix/node-env.nix \
        --output ./nix/node-packages.nix \
        --composition ./nix/default.nix \
        --nodejs-${nodeVersion}

      mkdir --parents "$(pwd)/tmp"

      set +v
    '';
  })
