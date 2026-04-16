import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PLAYWRIGHT_CACHE = path.join(os.homedir(), ".cache", "ms-playwright");
const PLAYWRIGHT_CANDIDATE_SUFFIXES = [
  path.join("chrome-linux", "chrome"),
  path.join("chrome-linux64", "chrome"),
];

function isExecutable(filePath: string | undefined | null): filePath is string {
  if (!filePath) return false;
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveNewestPlaywrightChromium(): string | null {
  if (!fs.existsSync(PLAYWRIGHT_CACHE)) return null;

  const matches = fs
    .readdirSync(PLAYWRIGHT_CACHE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .flatMap((entry) => {
      const root = path.join(PLAYWRIGHT_CACHE, entry.name);
      return PLAYWRIGHT_CANDIDATE_SUFFIXES.map((suffix) => path.join(root, suffix)).filter(isExecutable);
    });

  return matches.at(-1) ?? null;
}

export function resolveAutomationBrowserPath(): string {
  const override = process.env.BROWSER_AUTOMATION_BIN;
  if (isExecutable(override)) return override;

  const detected = resolveNewestPlaywrightChromium();
  if (detected) return detected;

  throw new Error(
    "No Playwright Chromium binary found. Set BROWSER_AUTOMATION_BIN or install one with 'pnpm --dir scripts exec playwright install chromium'.",
  );
}
