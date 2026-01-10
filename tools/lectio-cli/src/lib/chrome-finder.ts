import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { platform } from "node:os";

const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/usr/bin/brave-browser",
    "/usr/bin/microsoft-edge",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
};

export function findChrome(customPath?: string): string {
  // If custom path provided, validate it
  if (customPath) {
    if (existsSync(customPath)) {
      return customPath;
    }
    throw new Error(`Specified Chrome path does not exist: ${customPath}`);
  }

  const os = platform();
  const paths = CHROME_PATHS[os] ?? [];

  // Check known paths
  for (const chromePath of paths) {
    if (chromePath && existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Try 'which' command on Unix systems
  if (os !== "win32") {
    const commands = [
      "google-chrome",
      "google-chrome-stable",
      "chromium",
      "chromium-browser",
    ];
    for (const cmd of commands) {
      try {
        const result = execSync(`which ${cmd} 2>/dev/null`, {
          encoding: "utf-8",
        }).trim();
        if (result && existsSync(result)) {
          return result;
        }
      } catch {
        // Continue to next command
      }
    }
  }

  // Try 'where' command on Windows
  if (os === "win32") {
    try {
      const result = execSync("where chrome.exe 2>nul", {
        encoding: "utf-8",
      })
        .trim()
        .split("\n")[0];
      if (result && existsSync(result)) {
        return result;
      }
    } catch {
      // Continue
    }
  }

  throw new Error(
    "Chrome/Chromium not found. Install Chrome or set path with:\n" +
      '  lectio config --set chromePath "/path/to/chrome"'
  );
}
