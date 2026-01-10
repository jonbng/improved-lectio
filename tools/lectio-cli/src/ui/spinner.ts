import ora, { Ora } from "ora";
import chalk from "chalk";

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: "blue",
  });
}

export function success(spinner: Ora, text: string): void {
  spinner.succeed(chalk.green(text));
}

export function fail(spinner: Ora, text: string): void {
  spinner.fail(chalk.red(text));
}

export function info(spinner: Ora, text: string): void {
  spinner.info(chalk.blue(text));
}

export function warn(spinner: Ora, text: string): void {
  spinner.warn(chalk.yellow(text));
}
