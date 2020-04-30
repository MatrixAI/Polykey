{
  pkgs ? import ./pkgs.nix
}:

with pkgs;
let
  nodeVersion = "12";
  nodePackages = pkgs."nodePackages_${nodeVersion}_x";
  drv = callPackage ./default.nix {};
in
  drv.overrideAttrs (attrs: {
    src = null;
    nativeBuildInputs = [
      nodePackages.node2nix
    ] ++ (lib.attrByPath [ "nativeBuildInputs" ] [] attrs);
    shellHook = ''
      echo 'Entering ${attrs.name}'
      set -o allexport
      . ./.env
      set +o allexport
      set -v

      export PATH="$(pwd)/dist/bin:$(npm bin):$PATH"

      # setting up for nix-build
      npm install --package-lock-only
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
