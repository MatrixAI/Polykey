{ runCommandNoCC
, linkFarm
, nix-gitignore
, nodejs
, nodePackages
, pkgs
, lib
, fetchurl
, fetchFromGitHub
}:

rec {
  # this removes the org scoping
  basename = builtins.baseNameOf node2nixDev.packageName;
  src = nix-gitignore.gitignoreSource [".git"] ./.;
  nodeVersion = builtins.elemAt (lib.versions.splitVersion nodejs.version) 0;
  # custom node2nix directly from GitHub
  node2nixSrc = fetchFromGitHub {
    owner = "svanderburg";
    repo = "node2nix";
    rev = "68f5735f9a56737e3fedceb182705985e3ab8799";
    sha256 = "1f791vikig65ly5vcw6zjd0nv2qb8l5w5lr3xy343iq6746s1bil";
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
      # The dependencies were prepared in the installphase
      # See `node2nix` generated `node-env.nix` for details
      npm run build
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
        ];
  pkg = nodePackages.pkg.override {
    postFixup = ''
      patch -p0 < ${./nix/leveldown.patch}
    '';
  };
}
