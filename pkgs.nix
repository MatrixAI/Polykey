import (
  let rev = "a5774e76bb8c3145eac524be62375c937143b80c"; in
  builtins.fetchTarball "https://github.com/NixOS/nixpkgs/archive/${rev}.tar.gz"
)
