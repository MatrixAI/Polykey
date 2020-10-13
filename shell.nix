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
      openapi-generator-cli
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
      mkdir --parents "$(pwd)/nix/generated"
      node2nix -d \
        --input package.json \
        --lock package-lock.json \
        --node-env ./nix/generated/node-env.nix \
        --output ./nix/generated/node-packages.nix \
        --composition ./nix/generated/node-composition.nix \
        --nodejs-${nodeVersion}

      mkdir --parents "$(pwd)/tmp"

      set +v
    '';
  })
