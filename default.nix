{
  pkgs ? import ./pkgs.nix,
  nodeVersion ? "12_x"
}:
  with pkgs;
  let
    nodejs = lib.getAttrFromPath
            (lib.splitString "." ("nodejs-" + nodeVersion))
            pkgs;
    nodePackages = lib.getAttrFromPath
                   (lib.splitString "." ("nodePackages_" + nodeVersion))
                   pkgs;
  in
    stdenv.mkDerivation {
      name = "js-polykey";
      version = "0.0.1";
      src = lib.cleanSourceWith {
        filter = (path: type:
          ! (builtins.any
            (r: (builtins.match r (builtins.baseNameOf path)) != null)
            [
              "node_modules"
              "\.env"
            ])
        );
        src = lib.cleanSource attrs.src;
      };
      buildInputs = [ nodejs dos2unix ];
      checkInputs = [ webpack ];
    }
