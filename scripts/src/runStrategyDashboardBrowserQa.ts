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
const storageState = process.env.DASHBOARD_QA_STORAGE_STATE;
const authMode = process.env.DASHBOARD_QA_AUTH_MODE ?? (storageState ? "signed-in" : "signed-out");
const hostResolverRules = process.env.DASHBOARD_QA_HOST_RESOLVER_RULES;
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

const signedOutPaths = ["/", "/strategy", "/review", "/package", "/batch", "/handoff"];

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

async function runSignedOutGateCheck(page: Page, pathname: string, viewportLabel: string): Promise<ScreenshotReceipt> {
  await page.goto(urlFor(pathname), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Sign in to Algo-Rhythm", exact: true }).waitFor({ timeout: 15_000 });
  await page.getByText("Clerk UI gate", { exact: false }).first().waitFor({ timeout: 10_000 });

  const dashboardHeadingVisible = await page.getByRole("heading", { name: "Overview", exact: true }).isVisible().catch(() => false);
  if (dashboardHeadingVisible) {
    throw new Error(`${pathname} rendered dashboard content while signed out.`);
  }

  const screenshot = path.join(outputDir, `${viewportLabel}-signed-out-${sanitizeLabel(pathname === "/" ? "root" : pathname)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return { viewport: viewportLabel, route: pathname, screenshot };
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

async function runReviewerWorkspaceCheck(page: Page) {
  await page.goto(urlFor("/review"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Make the beta review usable", exact: true }).waitFor({ timeout: 10_000 });

  await page.getByLabel("Reviewer alias").fill("browser-qa-reviewer");
  await page.getByLabel("Accept with notes").check();
  await page.getByLabel("Selected run").selectOption("20260414T232200Z");
  await page.getByLabel("Confidence").selectOption("high");

  for (const label of [
    "State model understood",
    "Recommendation understood",
    "Package reviewed",
    "Batch reviewed",
    "Handoff/download chain trusted",
  ]) {
    await page.getByLabel(label).check();
  }

  await page.getByRole("button", { name: "Add issue" }).click();
  await page.getByLabel("Category 1").selectOption("usability_feedback");
  await page.getByLabel("Summary").fill("Browser QA confirms reviewer workspace is usable");
  await page.getByLabel("Detail").fill("The signed-in reviewer can classify feedback and export a local receipt without network writes.");
  await page.getByLabel("Reviewer notes").fill("Signed-in QA completed the R35 reviewer workflow.");

  const [jsonDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download JSON receipt" }).click(),
  ]);
  if (!jsonDownload.suggestedFilename().endsWith(".json")) {
    throw new Error(`Expected JSON receipt download, received ${jsonDownload.suggestedFilename()}`);
  }
  const jsonPath = await jsonDownload.path();
  if (!jsonPath) throw new Error("JSON receipt download did not produce a local path.");
  const receipt = JSON.parse(await fs.promises.readFile(jsonPath, "utf8"));
  if (receipt.schema_version !== "reviewer_session_v1") {
    throw new Error(`Unexpected receipt schema ${receipt.schema_version}`);
  }
  if (receipt.review_context?.review_mode !== "multi_run_review") {
    throw new Error(`Unexpected receipt review_mode ${receipt.review_context?.review_mode}`);
  }
  if (receipt.review_context?.cohort_size !== 4) {
    throw new Error(`Unexpected receipt cohort_size ${receipt.review_context?.cohort_size}`);
  }
  if (receipt.review_context?.recommended_run_id !== "20260414T232200Z") {
    throw new Error(`Unexpected receipt recommended_run_id ${receipt.review_context?.recommended_run_id}`);
  }
  for (const runId of ["20260414T232200Z", "20260414T232000Z", "20260414T232500Z", "20260416T124500Z"]) {
    if (!receipt.review_context?.included_run_ids?.includes(runId)) {
      throw new Error(`Receipt missing included run ${runId}`);
    }
  }
  if (receipt.issues?.[0]?.category !== "usability_feedback") {
    throw new Error("Receipt did not include the browser QA issue category.");
  }

  const [markdownDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Markdown summary" }).click(),
  ]);
  if (!markdownDownload.suggestedFilename().endsWith(".md")) {
    throw new Error(`Expected Markdown receipt download, received ${markdownDownload.suggestedFilename()}`);
  }
}

async function main() {
  ensureDir(outputDir);
  const browserPath = resolveAutomationBrowserPath();
  const browser = await chromium.launch({
    headless: !headed,
    executablePath: browserPath,
    args: hostResolverRules ? [`--host-resolver-rules=${hostResolverRules}`] : [],
  });
  const consoleErrors: string[] = [];
  const screenshots: ScreenshotReceipt[] = [];

  try {
    if (authMode === "signed-in" && !storageState) {
      throw new Error("DASHBOARD_QA_STORAGE_STATE is required when DASHBOARD_QA_AUTH_MODE=signed-in.");
    }

    for (const viewport of [
      { label: "desktop", width: 1440, height: 960 },
      { label: "mobile", width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        acceptDownloads: true,
        ...(storageState ? { storageState } : {}),
      });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(`[${viewport.label}] ${message.text()}`);
      });

      if (authMode === "signed-out") {
        for (const pathname of signedOutPaths) {
          screenshots.push(await runSignedOutGateCheck(page, pathname, viewport.label));
        }
      } else {
        for (const route of routes) {
          screenshots.push(await runRouteCheck(page, route, viewport.label));
        }
        if (viewport.label === "desktop") {
          await runReviewerWorkspaceCheck(page);
        }
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
    host_resolver_rules_used: Boolean(hostResolverRules),
    auth_mode: authMode,
    storage_state_used: Boolean(storageState),
    review_mode: "multi_run_review",
    routes: authMode === "signed-out" ? signedOutPaths : routes.map((route) => route.path),
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
