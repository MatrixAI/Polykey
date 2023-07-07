{ runCommandNoCC
, linkFarm
, nix-gitignore
, nodejs
, node2nix
, pkgs
, lib
, fetchurl
, fetchFromGitHub
}:

rec {
  # This removes the org scoping
  basename = builtins.baseNameOf node2nixDev.packageName;
  # Filter source to only what's necessary for building
  src = nix-gitignore.gitignoreSource [
    # The `.git` itself should be ignored
    ".git"
    # Hidden files
    "/.*"
    # Nix files
    "/*.nix"
    # Benchmarks
    "/benches"
    # Docs
    "/docs"
    # Tests
    "/tests"
    "/jest.config.js"
  ] ./.;
  nodeVersion = builtins.elemAt (lib.versions.splitVersion nodejs.version) 0;
  node2nixDrv = dev: runCommandNoCC "node2nix" {} ''
    mkdir $out
    ${node2nix}/bin/node2nix \
      ${lib.optionalString dev "--development"} \
      --input ${src}/package.json \
      --lock ${src}/package-lock.json \
      --node-env $out/node-env.nix \
      --output $out/node-packages.nix \
      --composition $out/default.nix \
      --nodejs-${nodeVersion}
  '';
  node2nixProd = (import (node2nixDrv false) { inherit pkgs nodejs; }).nodeDependencies.override (attrs: {
    # Use filtered source
    src = src;
    # Do not run build scripts during npm rebuild and npm install
    npmFlags = "--ignore-scripts";
    # Do not run npm install, dependencies are installed by nix
    dontNpmInstall = true;
  });
  node2nixDev = (import (node2nixDrv true) { inherit pkgs nodejs; }).package.override (attrs: {
    # Use filtered source
    src = src;
    # Do not run build scripts during npm rebuild and npm install
    # They will be executed in the postInstall hook
    npmFlags = "--ignore-scripts";
    # Show full compilation flags
    NIX_DEBUG = 1;
    # Don't set rpath for native addons
    # Native addons do not require their own runtime search path
    # because they dynamically loaded by the nodejs runtime
    NIX_DONT_SET_RPATH = true;
    NIX_NO_SELF_RPATH = true;
    postInstall = ''
      # Path to headers used by node-gyp for native addons
      export npm_config_nodedir="${nodejs}"
      # This will setup the typescript build
      npm run build
    '';
  });
  pkgBuilds = {
    "3.5" = {
      "linux-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.5/node-v18.15.0-linux-x64";
        sha256 = "0glr88p9higdwsffg3l243kpixqcf1mb7fawq62rj9n7b275lwx4";
      };
      "win32-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.5/node-v18.15.0-win-x64";
        sha256 = "1d51w02m5jv7fgk3brkv3wizn1l75rai1zyq8m9vlm1za1gaha8p";
      };
      "macos-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.5/node-v18.15.0-macos-x64";
        sha256 = "1qcih9l3vncg05glhr45avcz2p5sqk7sp9776q4133xg88s09k0k";
      };
      # No build for v18.15.0 macos-arm64 build
      # "macos-arm64" = fetchurl {
      #   url = "https://github.com/vercel/pkg-fetch/releases/download/v3.4/node-v16.15.0-macos-arm64";
      #   sha256 = "VNCPKjPQjLhzyX8d/FJ/dvDQcA9Gv9YZ6Wf2EcDCARI=";
      # };
    };
  };
  pkgCachePath =
    let
      pkgBuild = pkgBuilds."3.5";
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
          # No build for v18.15 macos-arm64 build
          # {
          #   name = fetchedName pkgBuild.macos-arm64.name;
          #   path = pkgBuild.macos-arm64;
          # }
        ];
}
