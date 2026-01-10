import Fuse from "fuse.js";
import type { School, SchoolCache } from "../types.js";
import { getSchoolsCache, setSchoolsCache } from "./storage.js";

const SCHOOLS_URL = "https://www.lectio.dk/lectio/login_list.aspx?forcemobile=1";

export async function fetchSchools(forceRefresh = false): Promise<School[]> {
  // Check cache first
  if (!forceRefresh) {
    const cached = getSchoolsCache();
    if (cached?.schools.length) {
      return cached.schools;
    }
  }

  // Fetch fresh list
  const response = await fetch(SCHOOLS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch school list: ${response.status}`);
  }

  const html = await response.text();
  const schools = parseSchools(html);

  // Cache the result
  const cache: SchoolCache = {
    schools,
    fetchedAt: Date.now(),
  };
  setSchoolsCache(cache);

  return schools;
}

function parseSchools(html: string): School[] {
  const schools: School[] = [];

  // Parse school links: <a href='/lectio/{id}/default.aspx'>School Name</a>
  // Note: Lectio uses single quotes in the HTML
  const linkRegex =
    /<a href=['"]\/lectio\/(\d+)\/default\.aspx['"]>([^<]+)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const [, id, name] = match;
    if (id && name) {
      const decodedName = decodeHtmlEntities(name.trim());
      // Skip "Vis alle skoler" link
      if (decodedName.toLowerCase().includes("vis alle skoler")) {
        continue;
      }
      schools.push({
        id,
        name: decodedName,
        url: `/lectio/${id}/default.aspx`,
      });
    }
  }

  return schools;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function searchSchools(schools: School[], query: string): School[] {
  if (!query.trim()) {
    return schools;
  }

  const fuse = new Fuse(schools, {
    keys: ["name", "id"],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  return fuse.search(query).map((result) => result.item);
}

export function findSchoolById(schools: School[], id: string): School | undefined {
  return schools.find((s) => s.id === id);
}
