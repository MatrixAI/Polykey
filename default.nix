{ pkgs, nix-gitignore }:

let
  drv = (import ./nix/default.nix { inherit pkgs; }).package;
in
  drv.overrideAttrs (attrs: {
    src = nix-gitignore.gitignoreSource [] attrs.src;
  })
