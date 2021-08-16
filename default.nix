{ runCommandNoCC
, callPackage
}:

let
  utils = callPackage ./utils.nix {};
  drv = runCommandNoCC
    "${utils.basename}-${utils.node2nixDev.version}"
    {
      version = utils.node2nixDev.version;
      packageName = utils.node2nixDev.packageName;
    }
    ''
    mkdir -p $out/lib/node_modules/${utils.node2nixDev.packageName}
    # copy only the dist
    cp -r ${utils.node2nixDev}/lib/node_modules/${utils.node2nixDev.packageName}/dist $out/lib/node_modules/${utils.node2nixDev.packageName}/
    # copy over the production dependencies
    if [ -d "${utils.node2nixProd}/lib/node_modules" ]; then
      cp -r ${utils.node2nixProd}/lib/node_modules $out/lib/node_modules/${utils.node2nixDev.packageName}/
    fi
    # create symlink to the deployed executable folder, if applicable
    if [ -d "${utils.node2nixDev}/lib/node_modules/.bin" ]; then
      cp -r ${utils.node2nixDev}/lib/node_modules/.bin $out/lib/node_modules/
      ln -s $out/lib/node_modules/.bin $out/bin
    fi
  '';
in
  drv
