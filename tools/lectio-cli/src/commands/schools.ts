import { Command } from "commander";
import chalk from "chalk";
import { fetchSchools, searchSchools } from "../lib/schools.js";
import { createSpinner, success } from "../ui/spinner.js";

export const schoolsCommand = new Command("schools")
  .description("List or search for schools")
  .option("-s, --search <query>", "Search schools by name")
  .option("--json", "Output as JSON")
  .option("-r, --refresh", "Force refresh the school cache")
  .option("-c, --count", "Only show the count of schools")
  .action(async (options) => {
    const { search, json, refresh, count } = options;

    try {
      const spinner = json ? null : createSpinner("Fetching schools...");
      spinner?.start();

      const schools = await fetchSchools(refresh);

      if (spinner) {
        success(spinner, `Found ${schools.length} schools`);
      }

      // Apply search filter if provided
      const filteredSchools = search ? searchSchools(schools, search) : schools;

      if (count) {
        if (json) {
          console.log(
            JSON.stringify({
              success: true,
              count: filteredSchools.length,
              total: schools.length,
            })
          );
        } else {
          if (search) {
            console.log(
              `${chalk.bold(filteredSchools.length)} schools matching "${search}" (${schools.length} total)`
            );
          } else {
            console.log(`${chalk.bold(schools.length)} schools`);
          }
        }
        return;
      }

      if (json) {
        console.log(
          JSON.stringify({
            success: true,
            count: filteredSchools.length,
            schools: filteredSchools,
          })
        );
      } else {
        if (search && filteredSchools.length === 0) {
          console.log(chalk.yellow(`No schools found matching "${search}"`));
          return;
        }

        if (search) {
          console.log(
            chalk.gray(`\nShowing ${filteredSchools.length} schools matching "${search}":\n`)
          );
        } else {
          console.log(chalk.gray(`\nAll ${schools.length} schools:\n`));
        }

        for (const school of filteredSchools) {
          console.log(
            `  ${chalk.bold(school.name)} ${chalk.gray(`(ID: ${school.id})`)}`
          );
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
