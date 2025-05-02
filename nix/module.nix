{
  config,
  pkgs,
  lib,
  ...
}: let
  inherit (lib) mkEnableOption mkOption mkIf;
  inherit (lib.types) path;

  cfg = config.services.factbot;
in {
  options.services.factbot = {
    enable = mkEnableOption "factbot service";
    tokenFile = mkOption {
      type = path;
      description = ''
        Path to the utf-8 encoded file containing the Discord bot token.
      '';
    };
  };

  config = {
    nixpkgs.overlays = [
      (import ./overlay.nix)
    ];
    systemd.services = mkIf cfg.enable {
      factbot = {
        description = "factbot service.";
        wantedBy = ["multi-user.target"];
        after = ["network.target"];
        environment = {
          IMAGES_DIR = "/var/lib/factbot/images";
          DATA_DIR = "/var/lib/factbot/data";
          TOKEN_FILE = cfg.tokenFile;
        };
        serviceConfig = {
          Type = "simple";
          ExecStart = "${pkgs.factbot}/bin/factbot";
          Restart = "on-failure";
          StateDirectory = "factbot";

          # Basic hardening
          NoNewPrivileges = "yes";
          PrivateTmp = "yes";
          PrivateDevies = "yes";
          DevicePolicy = "closed";
          DynamicUser = "yes";
          ProtectSystem = "strict";
          ProtectHome = "yes";
          ProtectControlGroups = "yes";
          ProtectKernelModules = "yes";
          ProtectKernelTunables = "yes";
          RestrictAddressFamilies = "AF_UNIX AF_INET AF_INET6 AF_NETLINK";
          RestrictNameSpaces = "yes";
          RestrictRealtime = "yes";
          RestrictSUIDSGID = "yes";
          LockPersonality = "yes";
        };
      };
    };
  };
}
