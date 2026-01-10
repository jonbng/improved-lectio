import puppeteer, { Browser, Page, Cookie } from "puppeteer";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AuthResult } from "../types.js";
import { findChrome } from "./chrome-finder.js";

interface AuthOptions {
  schoolId: string;
  chromePath?: string;
  timeout?: number; // in milliseconds
  onMessage?: (message: string) => void;
}

const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL = 500; // 500ms

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function authenticateWithBrowser(
  options: AuthOptions
): Promise<AuthResult> {
  const { schoolId, chromePath, timeout = DEFAULT_TIMEOUT, onMessage } = options;

  const executablePath = findChrome(chromePath);
  const userDataDir = mkdtempSync(join(tmpdir(), "lectio-cli-"));

  let browser: Browser | null = null;

  try {
    onMessage?.("Launching browser...");

    browser = await puppeteer.launch({
      headless: false,
      executablePath,
      userDataDir,
      args: [
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-popup-blocking",
        "--window-size=1024,768",
      ],
      defaultViewport: {
        width: 1024,
        height: 768,
      },
    });

    const page = await browser.newPage();

    // Navigate to login page
    const loginUrl = `https://www.lectio.dk/lectio/${schoolId}/login.aspx`;
    onMessage?.(`Navigating to ${loginUrl}`);

    await page.goto(loginUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    onMessage?.("Please log in using the browser window...");

    // Poll for authentication cookie
    const cookies = await pollForAuthentication(page, timeout);

    onMessage?.("Authentication successful!");

    return { success: true, cookies };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      cookies: [],
      error: message,
    };
  } finally {
    // Close browser
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }

    // Clean up temp directory
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function pollForAuthentication(
  page: Page,
  timeout: number
): Promise<Cookie[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const cookies = await page.cookies();
      const authCookie = cookies.find(
        (c) => c.name === "isloggedin3" && c.value === "Y"
      );

      if (authCookie) {
        // Also verify we have the school cookie
        const schoolCookie = cookies.find((c) => c.name === "BaseSchoolUrl");
        if (schoolCookie) {
          return cookies;
        }
      }
    } catch {
      // Page might be navigating, ignore and retry
    }

    await delay(POLL_INTERVAL);
  }

  throw new Error(
    "Authentication timeout. Please try again and complete the login within 5 minutes."
  );
}
