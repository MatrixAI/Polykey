{ runCommandNoCC
, callPackage
, jq
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
    # symlink bin executables
    if [ \
      "$(${jq}/bin/jq 'has("bin")' "$out/lib/node_modules/$packageName/package.json")" \
      == \
      "true" \
    ]; then
      mkdir -p "$out/bin"
      while IFS= read -r bin_name && IFS= read -r bin_path; do
        # make files executable
        chmod a+x "$out/lib/node_modules/$packageName/$bin_path"
        # create the symlink
        ln -s \
          "../lib/node_modules/$packageName/$bin_path" \
          "$out/bin/$bin_name"
      done < <(
        ${jq}/bin/jq -r 'select(.bin != null) | .bin | to_entries[] | (.key, .value)' \
        "$out/lib/node_modules/$packageName/package.json"
      )
    fi
    '';
in
  drv
