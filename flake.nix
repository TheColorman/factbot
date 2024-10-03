{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    pkgs = nixpkgs.legacyPackages.x86_64-linux;
    runtime = with pkgs; [ nodejs_22 pnpm_9 ];
    in rec {

    devShells.x86_64-linux.default = pkgs.mkShell {
      packages = runtime;
      shellHook = ''
        code .
      '';
    };
  };
}
