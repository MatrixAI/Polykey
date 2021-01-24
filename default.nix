{ runCommandNoCC
, nix-gitignore
, nodejs
, nodePackages
, pkgs
, lib
}:

let
  src = nix-gitignore.gitignoreSource [".git"] ./.;
  nodeVersion = builtins.elemAt (lib.versions.splitVersion nodejs.version) 0;
  node2nixDrv = dev: runCommandNoCC "node2nix" {} ''
    mkdir $out
    ${nodePackages.node2nix}/bin/node2nix \
      ${lib.optionalString dev "--development"} \
      --input ${src}/package.json \
      --lock ${src}/package-lock.json \
      --node-env $out/node-env.nix \
      --output $out/node-packages.nix \
      --composition $out/default.nix \
      --nodejs-${nodeVersion}
  '';
  devPackage = (import (node2nixDrv true) { inherit pkgs nodejs; }).package;
  prodDeps = (
    (import (node2nixDrv false) { inherit pkgs nodejs; }).shell.override {
      dontNpmInstall = true;
    }
  ).nodeDependencies;
  drv = devPackage.overrideAttrs (attrs: {
    src = src;
    dontNpmInstall = true;
    postInstall = ''
      # The dependencies were prepared in the install phase
      # See `node2nix` generated `node-env.nix` for details.
      npm run build

      # This call does not actually install packages. The dependencies
      # are present in `node_modules` already. It creates symlinks in
      # $out/lib/node_modules/.bin according to `bin` section in `package.json`.
      npm install

      # replace dev dependencies
      rm -rf $out/lib/node_modules/${attrs.packageName}/node_modules
      cp -r ${prodDeps}/lib/node_modules $out/lib/node_modules/${attrs.packageName}/

      # Create symlink to the deployed executable folder, if applicable
      if [ -d "$out/lib/node_modules/.bin" ]
      then
          ln -s $out/lib/node_modules/.bin $out/bin
      fi
    '';
  });
in
  drv
