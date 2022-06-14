{ runCommandNoCC
, linkFarm
, nix-gitignore
, nodejs
, pkgs
, lib
, fetchurl
, fetchFromGitHub
}:

rec {
  # this removes the org scoping
  basename = builtins.baseNameOf node2nixDev.packageName;
  src = nix-gitignore.gitignoreSource [".git" "/*.nix"] ./.;
  nodeVersion = builtins.elemAt (lib.versions.splitVersion nodejs.version) 0;
  # custom node2nix directly from GitHub
  node2nixSrc = fetchFromGitHub {
    owner = "svanderburg";
    repo = "node2nix";
    rev = "9377fe4a45274fab0c7faba4f7c43ffae8421dd2";
    sha256 = "15zip9w9hivd1p6k82hh4zba02jj6q0g2f1i9b7rrn2hs70qdlai";
  };
  node2nix = (import "${node2nixSrc}/release.nix" {}).package.x86_64-linux;
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
      # This will setup the typescript build
      npm --nodedir=${nodejs} run build
    '';
  });
  pkgBuilds = {
    "3.3" = {
      "linux-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.3/node-v16.14.2-linux-x64";
        sha256 = "1g5sljbb7zqqbfvl3n1hzfy6fd97ch06bbjfxnd7bz6ncmjk3rcg";
      };
      "win32-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.3/node-v16.14.2-win-x64";
        sha256 = "1c1fr8fvrfm49qgn0dibbr5givz2qccb91qrwilxlhj289ba0sgm";
      };
      "macos-x64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.3/node-v16.14.2-macos-x64";
        sha256 = "1hq7v40vzc2bfr29y71lm0snaxcc8rys5w0da7pi5nmx4pyybc2v";
      };
      "macos-arm64" = fetchurl {
        url = "https://github.com/vercel/pkg-fetch/releases/download/v3.3/node-v16.14.2-macos-arm64";
        sha256 = "05q350aw7fhirmlqg6ckyi5hg9pwcvs0w5r047r8mf3ivy1hxra4";
      };
    };
  };
  pkgCachePath =
    let
      pkgBuild = pkgBuilds."3.3";
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
          {
            name = fetchedName pkgBuild.macos-arm64.name;
            path = pkgBuild.macos-arm64;
          }
        ];
}
