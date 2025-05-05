{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
    in {
      packages = {
        factbot = pkgs.callPackage ./nix/package.nix {};
        default = self.packages.${system}.factbot;
      };
      modules = {
        factbot = import ./nix/module.nix;
        default = self.modules.${system}.factbot;
      };
      devShells.default = pkgs.mkShell {
        packages = with pkgs; [nodejs nodemon];
      };
    });
}
