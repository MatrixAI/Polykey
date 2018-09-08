{
  pkgs ? import ./pkgs.nix,
  nodePath ? "nodejs-8_x"
}:
  with pkgs;
  let
    nodejs = lib.getAttrFromPath (lib.splitString "." nodePath) pkgs;
  in
    stdenv.mkDerivation {
      name = "javascript-demo";
      version = "0.0.1";
      src = lib.cleanSourceWith {
        filter = (path: type:
          ! (builtins.any
            (r: (builtins.match r (builtins.baseNameOf path)) != null)
            [
              "node_packages"
              "\.env"
            ])
        );
        src = lib.cleanSource attrs.src;
      };
      buildInputs = [ nodejs ];
    }
