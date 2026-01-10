import { Command } from "commander";
import { writeFileSync } from "node:fs";
import chalk from "chalk";
import { fetchLectio, getCurrentSchoolId, getCurrentSchoolName } from "../lib/http.js";
import { isSessionValid } from "../lib/cookies.js";
import { createSpinner, success, fail } from "../ui/spinner.js";

export const fetchCommand = new Command("fetch")
  .description("Fetch a page from Lectio")
  .argument("<path>", "Page path (e.g., skemany.aspx) or full URL")
  .option("-o, --output <file>", "Save output to file instead of stdout")
  .option("-s, --school <id>", "Override school ID")
  .option("--json", "Output as JSON with headers and metadata")
  .option("--no-follow", "Don't follow redirects")
  .action(async (path, options) => {
    const { output, school, json, follow } = options;

    try {
      // Check if authenticated
      if (!isSessionValid()) {
        const message = "Not authenticated or session expired. Run 'lectio auth' first.";
        if (json) {
          console.log(JSON.stringify({ success: false, error: message }));
        } else {
          console.error(chalk.red("Error:"), message);
        }
        process.exit(1);
      }

      const schoolId = school ?? getCurrentSchoolId();
      const schoolName = getCurrentSchoolName();

      const spinner = json ? null : createSpinner(`Fetching ${path}...`);
      spinner?.start();

      const result = await fetchLectio(path, {
        schoolId,
        followRedirects: follow,
      });

      if (spinner) {
        success(spinner, `Fetched ${result.url} (${result.status})`);
      }

      if (json) {
        console.log(
          JSON.stringify({
            success: true,
            status: result.status,
            url: result.url,
            redirected: result.redirected,
            headers: result.headers,
            body: result.body,
            school: schoolId ? { id: schoolId, name: schoolName } : undefined,
          })
        );
      } else if (output) {
        writeFileSync(output, result.body, "utf-8");
        console.log(chalk.green("✓") + ` Saved to ${chalk.bold(output)}`);
        console.log(chalk.gray(`  ${result.body.length} bytes`));
      } else {
        // Output to stdout
        console.log(result.body);
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
