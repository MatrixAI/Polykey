import (
  let rev = "ce6aa13369b667ac2542593170993504932eb836"; in
  builtins.fetchTarball "https://github.com/NixOS/nixpkgs/archive/${rev}.tar.gz"
)
