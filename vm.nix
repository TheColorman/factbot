{
  imports = [./nix/module.nix];

  services.factbot.instances.main = {
    enable = true;
    tokenFile = ./BOT_TOKEN;
  };
}
