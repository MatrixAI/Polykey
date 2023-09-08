import (
  let rev = "ea5234e7073d5f44728c499192544a84244bf35a"; in
  builtins.fetchTarball "https://github.com/NixOS/nixpkgs/archive/${rev}.tar.gz"
)
