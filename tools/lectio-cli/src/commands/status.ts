import { Command } from "commander";
import chalk from "chalk";
import { getSessionStatus } from "../lib/cookies.js";

export const statusCommand = new Command("status")
  .description("Show current session status")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const { json } = options;

    const status = getSessionStatus();

    if (json) {
      console.log(JSON.stringify(status));
      return;
    }

    console.log(chalk.bold("Session Status"));
    console.log(chalk.gray("─".repeat(40)));

    if (!status.authenticated) {
      console.log(`Authenticated: ${chalk.red("No")}`);
      console.log(chalk.gray("\nRun 'lectio auth' to authenticate."));
      return;
    }

    console.log(`Authenticated: ${chalk.green("Yes")}`);

    if (status.school) {
      console.log(
        `School: ${chalk.bold(status.school.name)} ${chalk.gray(`(ID: ${status.school.id})`)}`
      );
    }

    if (status.session) {
      const validText = status.session.valid
        ? chalk.green("Valid")
        : chalk.red("Expired");
      console.log(`Session: ${validText}`);

      if (status.session.valid) {
        const minutes = Math.floor(status.session.expiresIn / 60);
        const seconds = status.session.expiresIn % 60;
        console.log(
          `Expires in: ${chalk.yellow(`${minutes}m ${seconds}s`)}`
        );
      }

      const lastActivity = new Date(status.session.lastActivity);
      const ago = formatTimeAgo(lastActivity);
      console.log(`Last activity: ${chalk.gray(ago)}`);
    }

    if (!status.session?.valid) {
      console.log(
        chalk.gray("\nRun 'lectio auth --force' to re-authenticate.")
      );
    }
  });

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
