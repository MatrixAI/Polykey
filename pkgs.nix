import (
  let rev = "22a81aa5fc15b2d41b12f7160a71cd4a9f3c3fa1"; in
  fetchTarball "https://github.com/NixOS/nixpkgs-channels/archive/${rev}.tar.gz"
) {}
