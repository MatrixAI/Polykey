{ runCommandNoCC
, linkFarm
, nix-gitignore
, nodejs
, nodePackages
, pkgs
, lib
, fetchurl
}:

rec {
  # this removes the org scoping
  basename = builtins.baseNameOf node2nixDev.packageName;
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
    (import (node2nixDrv false) { inherit pkgs nodejs; }).shell.override (attrs: {
      buildInputs = attrs.buildInputs ++ [ nodePackages.node-gyp-build ];
      dontNpmInstall = true;
    })
  ).nodeDependencies;
  node2nixDev = (import (node2nixDrv true) { inherit pkgs nodejs; }).package.override (attrs: {
    src = src;
    buildInputs = attrs.buildInputs ++ [ nodePackages.node-gyp-build ];
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
  pkgBuilds = {
    "3.1" = {
      "linux-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.1/node-v14.17.0-linux-x64";
        sha256 = "11vk7vfxa1327mr71gys8fhglrpscjaxrpnbk1jbnj5llyzcx52l";
      };
      "win32-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.1/node-v14.17.0-win-x64";
        sha256 = "08wf9ldy33sac1vmhd575zf2fhrbci3wz88a9nwdbccsxrkbgklc";
      };
      "macos-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.1/node-v14.17.0-macos-x64";
        sha256 = "0lwa6s66wy7qmj4wbpa65hv996vxzznrscqgwrk3q2zzpsra24q7";
      };
    };
  };
  pkgCachePath =
    let
      pkgBuild = pkgBuilds."3.1";
      fetchedName = n: builtins.replaceStrings ["node"] ["fetched"] n;
    in
      linkFarm "pkg-cache"
        [
          {
            name = fetchedName pkgBuild.linux-x64.name;
            path = pkgBuild.linux-x64;
          }
          {
            name = fetchedName pkgBuild.win32-x64.name;
            path = pkgBuild.win32-x64;
          }
          {
            name = fetchedName pkgBuild.macos-x64.name;
            path = pkgBuild.macos-x64;
          }
        ];
  pkg = pkgs.nodePackages.pkg.override {
    postFixup = ''
      patch -p0 < ${./nix/leveldown.patch}
    '';
  };
}
