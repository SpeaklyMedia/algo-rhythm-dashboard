import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { resolveAutomationBrowserPath } from "./browserPaths";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");
const defaultStorageState = path.join(
  process.env.HOME ?? process.cwd(),
  ".local/state/algo-rhythm-dashboard/playwright/algo-clerk-storage-state.json",
);
const baseUrl = process.env.DASHBOARD_QA_BASE_URL ?? "https://algo.mrksylvstr.com";
const storageState = path.resolve(process.env.DASHBOARD_QA_STORAGE_STATE ?? defaultStorageState);
const hostResolverRules = process.env.DASHBOARD_QA_HOST_RESOLVER_RULES;
const browserPath = resolveAutomationBrowserPath();

function isInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function urlFor(pathname: string): string {
  return new URL(pathname, baseUrl).toString();
}

async function main() {
  if (isInside(storageState, repoRoot)) {
    throw new Error(
      `Refusing to write Clerk Playwright storage state inside the Git checkout: ${storageState}`,
    );
  }

  fs.mkdirSync(path.dirname(storageState), { recursive: true, mode: 0o700 });

  const browser = await chromium.launch({
    headless: false,
    executablePath: browserPath,
    args: hostResolverRules ? [`--host-resolver-rules=${hostResolverRules}`] : [],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();

    process.stdout.write(`Opening Clerk sign-in: ${urlFor("/sign-in")}\n`);
    process.stdout.write("Complete login in the browser window. This script will save storage state after the dashboard loads.\n");

    await page.goto(urlFor("/sign-in"), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Overview", exact: true }).first().waitFor({ timeout: 5 * 60_000 });
    await page.goto(urlFor("/review"), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Make the beta review usable", exact: true }).waitFor({ timeout: 30_000 });

    await context.storageState({ path: storageState });
    fs.chmodSync(storageState, 0o600);
    process.stdout.write(`Saved Clerk Playwright storage state outside the repo: ${storageState}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
