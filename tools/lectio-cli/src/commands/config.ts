import { Command } from "commander";
import chalk from "chalk";
import {
  getConfig,
  updateConfig,
  resetConfig,
  getConfigPath,
} from "../lib/storage.js";

export const configCommand = new Command("config")
  .description("View or modify configuration")
  .option("--set <key=value>", "Set a config value (e.g., chromePath=/usr/bin/chromium)")
  .option("--reset", "Reset configuration to defaults")
  .option("--path", "Show config directory path")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const { set, reset, path, json } = options;

    try {
      if (path) {
        const configPath = getConfigPath();
        if (json) {
          console.log(JSON.stringify({ success: true, path: configPath }));
        } else {
          console.log(configPath);
        }
        return;
      }

      if (reset) {
        resetConfig();
        if (json) {
          console.log(JSON.stringify({ success: true, message: "Config reset" }));
        } else {
          console.log(chalk.green("✓") + " Configuration reset to defaults");
        }
        return;
      }

      if (set) {
        const [key, ...valueParts] = set.split("=");
        const value = valueParts.join("=");

        if (!key || value === undefined) {
          throw new Error("Invalid format. Use --set key=value");
        }

        const validKeys = ["chromePath", "defaultOutputDir"];
        if (!validKeys.includes(key)) {
          throw new Error(
            `Invalid config key: ${key}. Valid keys: ${validKeys.join(", ")}`
          );
        }

        updateConfig({ [key]: value || undefined });

        if (json) {
          console.log(
            JSON.stringify({
              success: true,
              key,
              value: value || null,
            })
          );
        } else {
          if (value) {
            console.log(chalk.green("✓") + ` Set ${key} = ${value}`);
          } else {
            console.log(chalk.green("✓") + ` Cleared ${key}`);
          }
        }
        return;
      }

      // Show current config
      const config = getConfig();
      const configPath = getConfigPath();

      if (json) {
        console.log(
          JSON.stringify({
            success: true,
            path: configPath,
            config,
          })
        );
      } else {
        console.log(chalk.bold("Configuration"));
        console.log(chalk.gray("─".repeat(40)));
        console.log(`Path: ${chalk.cyan(configPath)}`);
        console.log("");

        if (config.lastSchool) {
          console.log(
            `Last school: ${chalk.bold(config.lastSchool.name)} ${chalk.gray(`(ID: ${config.lastSchool.id})`)}`
          );
        } else {
          console.log(`Last school: ${chalk.gray("(none)")}`);
        }

        if (config.chromePath) {
          console.log(`Chrome path: ${chalk.cyan(config.chromePath)}`);
        } else {
          console.log(`Chrome path: ${chalk.gray("(auto-detect)")}`);
        }

        if (config.defaultOutputDir) {
          console.log(`Default output: ${chalk.cyan(config.defaultOutputDir)}`);
        } else {
          console.log(`Default output: ${chalk.gray("(current directory)")}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (json) {
        console.log(JSON.stringify({ success: false, error: message }));
      } else {
        console.error(chalk.red("Error:"), message);
      }
      process.exit(1);
    }
  });
