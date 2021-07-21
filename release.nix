{ pkgs ? import ./pkgs.nix {} }:

with pkgs;
let
  utils = callPackage ./utils.nix {};
  buildElf = arch:
    stdenv.mkDerivation rec {
      name = "${utils.basename}-${version}-linux-${arch}";
      version = utils.node2nixDev.version;
      src = "${utils.node2nixDev}/lib/node_modules/${utils.node2nixDev.packageName}";
      buildInputs = [
        utils.pkg
      ];
      PKG_CACHE_PATH = utils.pkgCachePath;
      PKG_IGNORE_TAG = 1;
      # ensure that native modules are built from source
      npm_config_build_from_source = "false";
      buildPhase = ''
        cp ${./package.json} package.json
        pkg . \
          --targets linux-${arch} \
          --no-bytecode \
          --public-packages "*" \
          --output out\
          --verbose
      '';
      installPhase = ''
        cp out $out
      '';
      dontFixup = true;
    };
  buildExe = arch:
    stdenv.mkDerivation rec {
      name = "${utils.basename}-${version}-win32-${arch}.exe";
      version = utils.node2nixDev.version;
      src = "${utils.node2nixDev}/lib/node_modules/${utils.node2nixDev.packageName}";
      buildInputs = [
        utils.pkg
      ];
      PKG_CACHE_PATH = utils.pkgCachePath;
      PKG_IGNORE_TAG = 1;
      # ensure that native modules are built from source
      npm_config_build_from_source = "false";
      buildPhase = ''
        cp ${./package.json} package.json
        pkg . \
          --targets win-${arch} \
          --no-bytecode \
          --public-packages "*" \
          --output out.exe
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
      buildInputs = [
        utils.pkg
      ];
      PKG_CACHE_PATH = utils.pkgCachePath;
      PKG_IGNORE_TAG = 1;
      # ensure that native modules are built from source
      npm_config_build_from_source = "false";
      buildPhase = ''
        cp ${./package.json} package.json
        pkg . \
          --targets macos-${arch} \
          --no-bytecode \
          --public-packages "*" \
          --output out
      '';
      installPhase = ''
        cp out $out
      '';
      dontFixup = true;
    };
  # allow resolution of localhost
  nsswitch = writeTextDir "etc/nsswitch.conf"
    ''
    hosts: files dns myhostname
    '';
in
  rec {
    application = callPackage ./default.nix {};
    docker = dockerTools.buildImage {
      name = application.name;
      contents = [ application cacert nsswitch ];
      keepContentsDirlinks = true;
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
      };
    };
  }
