{
  pkgs ? import ./pkgs.nix,
  nodePath ? "nodejs-8_x"
}:
  with pkgs;
  let
    drv = import ./default.nix { inherit pkgs nodePath; };
  in
    drv.overrideAttrs (attrs: {
      src = null;
      buildInputs = [ flow ] ++ attrs.buildInputs;
      shellHook = ''
        echo 'Entering ${attrs.name}'
        set -v

        export PATH="$(npm bin):$PATH"

        set +v
      '';
    })
