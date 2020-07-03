import (builtins.fetchGit {
  url = "git@gitlab.com:MatrixAI/nixpkgs-overlay.git";
}) {
  nixpkgs = (
    let rev = "af2046d3f15998ff638512bea674e0b5cf4a130e"; in
    fetchTarball "https://github.com/NixOS/nixpkgs-channels/archive/${rev}.tar.gz"
  );
}
