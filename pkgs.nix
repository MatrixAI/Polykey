import (
  let rev = "2867d1963aac8a5f587930644070b7d07e526db3"; in
  fetchTarball "https://github.com/NixOS/nixpkgs-channels/archive/${rev}.tar.gz"
) {}
