{ pkgs, nix-gitignore }:

let
  drv = (import ./nix/generated/node-composition.nix { inherit pkgs; }).package;
in
  drv.overrideAttrs (attrs: {
    src = nix-gitignore.gitignoreSource [] attrs.src;
  })
