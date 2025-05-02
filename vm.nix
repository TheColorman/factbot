{
  imports = [./nix/module.nix];

  services.factbot = {
    enable = true;
    tokenFile = ./BOT_TOKEN;
  };
}
