import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, type BrowserContext, type Page } from "playwright";
import { resolveAutomationBrowserPath } from "./browserPaths";

type RouteCheck = {
  path: string;
  label: string;
  heading: string;
  requiredText: string[];
};

type ScreenshotReceipt = {
  viewport: string;
  route: string;
  screenshot: string;
};

const headed = process.argv.includes("--headed");
const baseUrl = process.env.DASHBOARD_QA_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir =
  process.env.DASHBOARD_QA_OUTPUT_DIR ??
  path.join("test-results", "algo-rhythm-dashboard-browser-qa", new Date().toISOString().replace(/[:.]/g, "-"));

const routes: RouteCheck[] = [
  {
    path: "/",
    label: "overview",
    heading: "Overview",
    requiredText: ["multi-run review", "Roadmap-target multi-run Lane B review", "20260414T232200Z"],
  },
  {
    path: "/strategy",
    label: "strategy",
    heading: "Strategy",
    requiredText: ["Strategic substrate"],
  },
  {
    path: "/review",
    label: "review",
    heading: "Review",
    requiredText: ["Latest multi-run review recommendation", "Ranked runs in reviewed cohort", "20260416T124500Z"],
  },
  {
    path: "/package",
    label: "package",
    heading: "Package",
    requiredText: ["Review-bound package summary", "Package mode", "20260414T232200Z"],
  },
  {
    path: "/batch",
    label: "batch",
    heading: "Batch",
    requiredText: ["Reviewed cohort batch facts", "Runs in this reviewed cohort", "20260416T134500Z"],
  },
  {
    path: "/handoff",
    label: "handoff",
    heading: "Handoff",
    requiredText: ["Canonical downloads", "STRATEGY_RUN_BATCH 20260416T134500Z 20260416T134500Z"],
  },
];

const downloadPaths = [
  "/downloads/STRATEGY_RUN_PACKAGE__20260414T232200Z__20260416T134500Z.zip",
  "/downloads/STRATEGY_RUN_BATCH__20260416T134500Z__20260416T134500Z.zip",
  "/downloads/CANONICAL_POINTER__SSOT_LATEST.txt",
  "/downloads/CANONICAL_SHA256__SSOT_LATEST.txt",
];

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function urlFor(pathname: string): string {
  return new URL(pathname, baseUrl).toString();
}

async function assertNoRequiredDataFailure(page: Page, route: RouteCheck) {
  const blocked = await page.getByText("Dashboard blocked").isVisible().catch(() => false);
  if (blocked) throw new Error(`${route.label} rendered the required-data failure panel.`);

  const unavailable = await page
    .getByText("No required data is available for this section.", { exact: true })
    .isVisible()
    .catch(() => false);
  if (unavailable) throw new Error(`${route.label} rendered a missing required-data empty state.`);
}

async function runRouteCheck(page: Page, route: RouteCheck, viewportLabel: string): Promise<ScreenshotReceipt> {
  await page.goto(urlFor(route.path), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: route.heading, exact: true }).first().waitFor({ timeout: 10_000 });
  await assertNoRequiredDataFailure(page, route);

  for (const text of route.requiredText) {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
  }

  const screenshot = path.join(outputDir, `${viewportLabel}-${sanitizeLabel(route.label)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return { viewport: viewportLabel, route: route.path, screenshot };
}

async function assertDataContract(context: BrowserContext) {
  const response = await context.request.get(urlFor("/data/dashboard_index.json"));
  if (!response.ok()) {
    throw new Error(`dashboard_index.json returned ${response.status()}`);
  }

  const index = await response.json();
  const reviewMode = index?.review_mode;
  const expectedRuns = ["20260414T232200Z", "20260414T232000Z", "20260414T232500Z", "20260416T124500Z"];
  if (reviewMode?.review_mode !== "multi_run_review") {
    throw new Error(`Expected review_mode.multi_run_review, received ${JSON.stringify(reviewMode)}`);
  }
  if (reviewMode?.review_scope !== "reviewed_run_cohort") {
    throw new Error(`Expected reviewed_run_cohort, received ${reviewMode?.review_scope}`);
  }
  if (reviewMode?.cohort_size !== 4) {
    throw new Error(`Expected cohort_size 4, received ${reviewMode?.cohort_size}`);
  }
  if (reviewMode?.recommended_run_id !== "20260414T232200Z") {
    throw new Error(`Expected recommended_run_id 20260414T232200Z, received ${reviewMode?.recommended_run_id}`);
  }
  for (const runId of expectedRuns) {
    if (!reviewMode?.included_run_ids?.includes(runId)) {
      throw new Error(`Expected included_run_ids to include ${runId}`);
    }
  }
}

async function assertDownloadEndpoints(context: BrowserContext) {
  for (const downloadPath of downloadPaths) {
    const response = await context.request.get(urlFor(downloadPath));
    if (!response.ok()) {
      throw new Error(`${downloadPath} returned ${response.status()}`);
    }
    const body = await response.body();
    if (body.byteLength === 0) {
      throw new Error(`${downloadPath} returned an empty body`);
    }
  }
}

async function main() {
  ensureDir(outputDir);
  const browserPath = resolveAutomationBrowserPath();
  const browser = await chromium.launch({ headless: !headed, executablePath: browserPath });
  const consoleErrors: string[] = [];
  const screenshots: ScreenshotReceipt[] = [];

  try {
    for (const viewport of [
      { label: "desktop", width: 1440, height: 960 },
      { label: "mobile", width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(`[${viewport.label}] ${message.text()}`);
      });

      for (const route of routes) {
        screenshots.push(await runRouteCheck(page, route, viewport.label));
      }

      if (viewport.label === "desktop") {
        await assertDataContract(context);
        await assertDownloadEndpoints(context);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (consoleErrors.length > 0) {
    throw new Error(`Browser console errors detected:\n${consoleErrors.join("\n")}`);
  }

  const receipt = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    browser_path: browserPath,
    review_mode: "multi_run_review",
    routes: routes.map((route) => route.path),
    downloads: downloadPaths,
    screenshots,
  };
  const receiptPath = path.join(outputDir, "receipt.json");
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`Dashboard browser QA passed. Receipt: ${receiptPath}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
