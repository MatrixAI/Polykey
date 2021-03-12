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
  # the shell attribute has the nodeDependencies, whereas the package does not
  node2nixProd = (
    (import (node2nixDrv false) { inherit pkgs nodejs; }).shell.override {
      dontNpmInstall = true;
    }
  ).nodeDependencies;
  node2nixDev = (import (node2nixDrv true) { inherit pkgs nodejs; }).package.overrideAttrs (attrs: {
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
    '';
  });
  name = "${builtins.replaceStrings ["/" "@"] ["_" ""] node2nixDev.packageName}-${node2nixDev.version}";
  drv = runCommandNoCC name {} ''
    mkdir -p $out/lib/node_modules/${node2nixDev.packageName}
    # copy only the dist
    cp -r ${node2nixDev}/lib/node_modules/${node2nixDev.packageName}/dist $out/lib/node_modules/${node2nixDev.packageName}/
    # copy over the production dependencies
    if [ -d "${node2nixProd}/lib/node_modules" ]; then
      cp -r ${node2nixProd}/lib/node_modules $out/lib/node_modules/${node2nixDev.packageName}/
    fi
    # create symlink to the deployed executable folder, if applicable
    if [ -d "${node2nixDev}/lib/node_modules/.bin" ]; then
      cp -r ${node2nixDev}/lib/node_modules/.bin $out/lib/node_modules/
      ln -s $out/lib/node_modules/.bin $out/bin
    fi
  '';
in
  drv
