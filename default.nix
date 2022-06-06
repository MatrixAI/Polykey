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
    mkdir -p "$out/lib/node_modules/$packageName"
    # copy the package.json
    cp \
      "${utils.node2nixDev}/lib/node_modules/$packageName/package.json" \
      "$out/lib/node_modules/$packageName/"
    # copy the native addons
    if [ -d "${utils.node2nixDev}/lib/node_modules/$packageName/prebuilds" ]; then
      cp -r \
        "${utils.node2nixDev}/lib/node_modules/$packageName/prebuilds" \
        "$out/lib/node_modules/$packageName/"
    fi
    # copy the dist
    cp -r \
      "${utils.node2nixDev}/lib/node_modules/$packageName/dist" \
      "$out/lib/node_modules/$packageName/"
    # copy over the production dependencies
    if [ -d "${utils.node2nixProd}/lib/node_modules" ]; then
      cp -r \
        "${utils.node2nixProd}/lib/node_modules" \
        "$out/lib/node_modules/$packageName/"
    fi
    # create symlink to the deployed executable folder, if applicable
    if [ -d "${utils.node2nixDev}/lib/node_modules/.bin" ]; then
      cp -r ${utils.node2nixDev}/lib/node_modules/.bin $out/lib/node_modules/
      ln -s $out/lib/node_modules/.bin $out/bin
    fi
  '';
in
  drv
