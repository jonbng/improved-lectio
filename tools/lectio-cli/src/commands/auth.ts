import { Command } from "commander";
import chalk from "chalk";
import type { School } from "../types.js";
import { fetchSchools, findSchoolById, searchSchools } from "../lib/schools.js";
import { authenticateWithBrowser } from "../lib/browser.js";
import { saveCookies, isSessionValid, getSessionStatus } from "../lib/cookies.js";
import { getConfig, updateConfig } from "../lib/storage.js";
import { selectSchool } from "../ui/school-selector.js";
import { createSpinner, success, fail, info } from "../ui/spinner.js";

export const authCommand = new Command("auth")
  .description("Authenticate with Lectio by opening a browser")
  .option("-s, --school <id>", "School ID to authenticate with")
  .option("--search <query>", "Search for school by name")
  .option("-f, --force", "Force re-authentication even if session is valid")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const { school: schoolId, search, force, json } = options;

    try {
      // Check if already authenticated
      if (!force && isSessionValid()) {
        const status = getSessionStatus();
        if (json) {
          console.log(
            JSON.stringify({
              success: true,
              message: "Already authenticated",
              school: status.school,
              session: status.session,
            })
          );
        } else {
          console.log(
            chalk.green("✓") +
              ` Already authenticated with ${chalk.bold(status.school?.name)}`
          );
          console.log(
            chalk.gray(
              `  Session expires in ${Math.floor((status.session?.expiresIn ?? 0) / 60)} minutes`
            )
          );
          console.log(chalk.gray("  Use --force to re-authenticate"));
        }
        return;
      }

      // Fetch school list
      const spinner = createSpinner("Fetching school list...");
      spinner.start();

      const schools = await fetchSchools();
      success(spinner, `Found ${schools.length} schools`);

      // Select school
      let selectedSchool: School | undefined;

      if (schoolId) {
        // Direct school ID
        selectedSchool = findSchoolById(schools, schoolId);
        if (!selectedSchool) {
          throw new Error(`School with ID ${schoolId} not found`);
        }
      } else if (search) {
        // Search by name
        const matches = searchSchools(schools, search);
        if (matches.length === 0) {
          throw new Error(`No schools found matching "${search}"`);
        }
        if (matches.length === 1) {
          selectedSchool = matches[0];
        } else {
          if (json) {
            throw new Error(
              `Multiple schools found matching "${search}". Matches: ${matches.map((s) => s.name).join(", ")}`
            );
          }
          console.log(chalk.yellow(`Found ${matches.length} schools matching "${search}":`));
          selectedSchool = await selectSchool(matches);
        }
      } else {
        // Interactive selection
        if (json) {
          throw new Error("School ID required for JSON mode. Use --school <id>");
        }

        // Check for last used school
        const config = getConfig();
        if (config.lastSchool) {
          const lastSchool = findSchoolById(schools, config.lastSchool.id);
          if (lastSchool) {
            console.log(
              chalk.gray(`Last used: ${lastSchool.name} (ID: ${lastSchool.id})`)
            );
          }
        }

        selectedSchool = await selectSchool(schools);
      }

      if (!json) {
        console.log(`\nAuthenticating with ${chalk.bold(selectedSchool.name)}...`);
      }

      // Authenticate with browser
      const authSpinner = json ? null : createSpinner("Opening browser...");
      authSpinner?.start();

      const result = await authenticateWithBrowser({
        schoolId: selectedSchool.id,
        chromePath: getConfig().chromePath,
        onMessage: (msg) => {
          if (authSpinner) {
            authSpinner.text = msg;
          }
        },
      });

      if (!result.success) {
        if (authSpinner) {
          fail(authSpinner, `Authentication failed: ${result.error}`);
        }
        if (json) {
          console.log(
            JSON.stringify({
              success: false,
              error: result.error,
            })
          );
        }
        process.exit(1);
      }

      // Save cookies
      saveCookies(result.cookies, selectedSchool.id, selectedSchool.name);

      // Update last used school
      updateConfig({
        lastSchool: {
          id: selectedSchool.id,
          name: selectedSchool.name,
        },
      });

      if (authSpinner) {
        success(authSpinner, "Authentication successful!");
      }

      if (json) {
        const status = getSessionStatus();
        console.log(
          JSON.stringify({
            success: true,
            school: status.school,
            session: status.session,
          })
        );
      } else {
        console.log(
          chalk.green("\n✓") +
            ` Logged in to ${chalk.bold(selectedSchool.name)}`
        );
        console.log(chalk.gray("  Cookies saved to ~/.lectio-cli/cookies.json"));
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
