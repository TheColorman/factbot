{
  config,
  pkgs,
  lib,
  ...
}: let
  cfg = config.services.factbot;

  factbotOpts = with lib;
    {name, ...}: {
      options = {
        enable = mkEnableOption "factbot instance";

        name = mkOption {
          type = types.str;
          default = name;
          description = ''
            Name is used as a suffix for the service name. By default it takes
            the value you use for `<instance>` in:
            {option}`services.factbot.instances.<instances>`
          '';
        };

        package = mkPackageOption pkgs "factbot" {};

        tokenFile = mkOption {
          type = types.path;
          description = ''
            Path to the utf-8 encoded file containing the Discord bot token.
          '';
        };
      };
    };
in {
  options.services.factbot.instances = with lib;
    mkOption {
      default = {};
      type = types.attrsOf (types.submodule factbotOpts);
      description = ''
        Defines multiple factbot intances. If you don't require multiple
        instances of factbot, you can define just the one.
      '';
      example = ''
        {
        	main = {
        		enable = true;
        		tokenFile = /etc/factbot/token;
        	};
        	withSops = {
        		enable = true;
        		tokenFile = config.sops.secrets.factbotToken.path;
        	};
        }
      '';
    };

  config = let
    mkInstanceServiceConfig = instance: {
      description = "factbot discord bot, ${instance.name} instance";
      wantedBy = ["multi-user.target"];
      after = ["network.target"];
      environment = {
        IMAGES_DIR = "/var/lib/factbot-${instance.name}/images";
        DATA_DIR = "/var/lib/factbot-${instance.name}/data";
        TOKEN_FILE = instance.tokenFile;
      };
      serviceConfig = {
        Type = "simple";
        ExecStart = "${instance.package}/bin/factbot";
        Restart = "on-failure";
        StateDirectory = "factbot-${instance.name}";

        # Basic hardening
        NoNewPrivileges = true;
        PrivateTmp = true;
        PrivateDevies = true;
        DevicePolicy = "closed";
        DynamicUser = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ProtectControlGroups = true;
        ProtectKernelModules = true;
        ProtectKernelTunables = true;
        RestrictAddressFamilies = ["AF_UNIX" "AF_INET" "AF_INET6" "AF_NETLINK"];
        RestrictNameSpaces = true;
        RestrictRealtime = true;
        RestrictSUIDSGID = true;
        LockPersonality = true;
        SystemCallFilter = [
          "@system-service"
          "~@cpu-emulation"
          "~@debug"
          "~@keyring"
          "~@memlock"
          "~@obsolete"
          "~@privileged"
          "~@setuid"
        ];
      };
    };
    instances = lib.attrValues cfg.instances;
  in {
    nixpkgs.overlays = [
      (import ./overlay.nix)
    ];

    systemd.services = lib.mkMerge (
      map (
        instance:
          lib.mkIf instance.enable {
            "factbot-${instance.name}" = mkInstanceServiceConfig instance;
          }
      )
      instances
    );
  };
}
