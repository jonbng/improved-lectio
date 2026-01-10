import { input, select, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import type { School } from "../types.js";
import { searchSchools } from "../lib/schools.js";

export async function selectSchool(schools: School[]): Promise<School> {
  // Prompt for search query
  const searchQuery = await input({
    message: "Search for your school:",
  });

  const matches = searchQuery.trim()
    ? searchSchools(schools, searchQuery)
    : schools.slice(0, 20);

  if (matches.length === 0) {
    console.log(chalk.yellow("No schools found matching your search."));
    console.log(chalk.gray("Showing all schools instead.\n"));
    return selectFromList(schools);
  }

  if (matches.length === 1) {
    const confirmed = await confirm({
      message: `Select ${chalk.green(matches[0].name)}?`,
      default: true,
    });

    if (confirmed) {
      return matches[0];
    }
    return selectFromList(schools);
  }

  return selectFromList(matches);
}

async function selectFromList(schools: School[]): Promise<School> {
  const choices = schools.map((school) => ({
    name: `${school.name} ${chalk.gray(`(ID: ${school.id})`)}`,
    value: school,
  }));

  return select({
    message: "Select your school:",
    choices,
    pageSize: 15,
  });
}

export async function confirmSchool(school: School): Promise<boolean> {
  return confirm({
    message: `Authenticate with ${chalk.green(school.name)}?`,
    default: true,
  });
}
