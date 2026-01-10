import type { FetchResult } from "../types.js";
import { getCookieHeader, getStoredSchoolId, updateCookiesFromResponse } from "./cookies.js";
import { getCookies } from "./storage.js";

interface FetchOptions {
  schoolId?: string;
  followRedirects?: boolean;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30000;

export function buildLectioUrl(path: string, schoolId: string): string {
  // If path is already a full URL, return it
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.replace(/^\/+/, "");

  // If path already includes /lectio/{id}/, use as-is
  if (/^lectio\/\d+\//.test(cleanPath)) {
    return `https://www.lectio.dk/${cleanPath}`;
  }

  // Build URL with school ID
  return `https://www.lectio.dk/lectio/${schoolId}/${cleanPath}`;
}

export async function fetchLectio(
  path: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { followRedirects = true, timeout = DEFAULT_TIMEOUT } = options;

  // Get school ID from options or stored cookies
  const schoolId = options.schoolId ?? getStoredSchoolId();
  if (!schoolId) {
    throw new Error(
      "No school ID specified and no authenticated session found.\n" +
        "Run 'lectio auth' first or specify --school."
    );
  }

  // Get cookies
  const cookieHeader = getCookieHeader();
  if (!cookieHeader) {
    throw new Error(
      "No cookies found. Run 'lectio auth' to authenticate first."
    );
  }

  const url = buildLectioUrl(path, schoolId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "da,en-US;q=0.7,en;q=0.3",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      redirect: followRedirects ? "follow" : "manual",
      signal: controller.signal,
    });

    const body = await response.text();

    // Convert headers to plain object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Update stored cookies from Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
    if (setCookieHeaders.length > 0) {
      updateCookiesFromResponse(setCookieHeaders);
    }

    // Check if we were redirected to login page (session expired)
    if (
      response.url.includes("/login.aspx") &&
      !path.includes("login.aspx")
    ) {
      throw new Error(
        "Session expired. Run 'lectio auth --force' to re-authenticate."
      );
    }

    return {
      status: response.status,
      url: response.url,
      headers,
      body,
      redirected: response.redirected,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getCurrentSchoolId(): string | null {
  return getStoredSchoolId();
}

export function getCurrentSchoolName(): string | null {
  const store = getCookies();
  return store?.schoolName ?? null;
}
