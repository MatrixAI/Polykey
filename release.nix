{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  utils = callPackage ./utils.nix {};
  buildElf = arch:
    stdenv.mkDerivation rec {
      name = "${utils.basename}-${version}-linux-${arch}";
      version = utils.node2nixDev.version;
      src = "${utils.node2nixDev}/lib/node_modules/${utils.node2nixDev.packageName}";
      nativeBuildInputs = [ nodejs ];
      PKG_CACHE_PATH = utils.pkgCachePath;
      PKG_IGNORE_TAG = 1;
      buildPhase = ''
        npm run pkg -- \
          --output=out \
          --bin=polykey \
          --node-version=${utils.nodeVersion} \
          --platform=linux \
          --arch=${arch}
      '';
      installPhase = ''
        cp out $out
      '';
      dontFixup = true;
    };
  buildExe = arch:
    stdenv.mkDerivation rec {
      name = "${utils.basename}-${version}-win-${arch}.exe";
      version = utils.node2nixDev.version;
      src = "${utils.node2nixDev}/lib/node_modules/${utils.node2nixDev.packageName}";
      nativeBuildInputs = [ nodejs ];
      PKG_CACHE_PATH = utils.pkgCachePath;
      PKG_IGNORE_TAG = 1;
      buildPhase = ''
        npm run pkg -- \
          --output=out.exe \
          --bin=polykey \
          --node-version=${utils.nodeVersion} \
          --platform=win32 \
          --arch=${arch}
      '';
      installPhase = ''
        cp out.exe $out
      '';
      dontFixup = true;
    };
  buildMacho = arch:
    stdenv.mkDerivation rec {
      name = "${utils.basename}-${version}-macos-${arch}";
      version = utils.node2nixDev.version;
      src = "${utils.node2nixDev}/lib/node_modules/${utils.node2nixDev.packageName}";
      nativeBuildInputs = [ nodejs ];
      PKG_CACHE_PATH = utils.pkgCachePath;
      PKG_IGNORE_TAG = 1;
      buildPhase = ''
        npm run pkg -- \
          --output=out \
          --bin=polykey \
          --node-version=${utils.nodeVersion} \
          --platform=darwin \
          --arch=${arch}
      '';
      installPhase = ''
        cp out $out
      '';
      dontFixup = true;
    };
in
  rec {
    application = callPackage ./default.nix {};
    docker = dockerTools.buildImage {
      name = application.name;
      contents = [ application ];
      # This ensures symlinks to directories are preserved in the image
      keepContentsDirlinks = true;
      # This adds a correct timestamp, however breaks binary reproducibility
      created = "now";
      extraCommands = ''
        mkdir -m 1777 tmp
      '';
      config = {
        Cmd = [ "/bin/polykey" ];
      };
    };
    package = {
      linux = {
        x64 = {
          elf = buildElf "x64";
        };
      };
      windows = {
        x64 = {
          exe = buildExe "x64";
        };
      };
      macos = {
        x64 = {
          macho = buildMacho "x64";
        };
        arm64 = {
          macho = buildMacho "arm64";
        };
      };
    };
  }
