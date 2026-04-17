import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
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

type ViewportCheck = {
  label: string;
  width: number;
  height: number;
};

const headed = process.argv.includes("--headed");
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");
const baseUrl = process.env.DASHBOARD_QA_BASE_URL ?? "http://127.0.0.1:4173";
const defaultStorageState = path.join(
  process.env.HOME ?? process.cwd(),
  ".local/state/algo-rhythm-dashboard/playwright/algo-clerk-storage-state.json",
);
const explicitStorageState = process.env.DASHBOARD_QA_STORAGE_STATE;
const authMode = process.env.DASHBOARD_QA_AUTH_MODE ?? (explicitStorageState ? "signed-in" : "signed-out");
const storageState =
  explicitStorageState ??
  (authMode === "signed-in" && fs.existsSync(defaultStorageState) ? defaultStorageState : undefined);
const hostResolverRules = process.env.DASHBOARD_QA_HOST_RESOLVER_RULES;
const expectClerkGoogleOption = /^(1|true|yes)$/i.test(process.env.DASHBOARD_QA_EXPECT_CLERK_GOOGLE ?? "");
const outputDir =
  process.env.DASHBOARD_QA_OUTPUT_DIR ??
  path.join("test-results", "algo-rhythm-dashboard-browser-qa", new Date().toISOString().replace(/[:.]/g, "-"));

const routes: RouteCheck[] = [
  {
    path: "/workspace",
    label: "workspace",
    heading: "Home",
    requiredText: ["Make a posting plan in 5 steps.", "Your Progress", "Download your plan."],
  },
  {
    path: "/intake",
    label: "intake",
    heading: "Check Idea",
    requiredText: ["What to do here", "Check the idea, audience, offer, and goal.", "Next: Edit Drafts"],
  },
  {
    path: "/drafts",
    label: "drafts",
    heading: "Edit Drafts",
    requiredText: ["What to do here", "Read each draft.", "Copy Draft"],
  },
  {
    path: "/calendar",
    label: "calendar",
    heading: "Pick Schedule",
    requiredText: ["What to do here", "This does not post for you.", "Next: Track Results"],
  },
  {
    path: "/results",
    label: "results",
    heading: "Track Results",
    requiredText: ["What to do here", "Add numbers after you post by hand.", "Next: Download Plan"],
  },
  {
    path: "/strategy",
    label: "internal-strategy",
    heading: "Strategy",
    requiredText: ["Strategic substrate"],
  },
  {
    path: "/review",
    label: "review",
    heading: "Review Approval",
    requiredText: ["Latest multi-run review recommendation", "Ranked runs in reviewed cohort", "20260416T124500Z"],
  },
  {
    path: "/admin/package",
    label: "admin-package",
    heading: "Package",
    requiredText: ["Review-bound package summary", "Package mode", "matches this review", "20260414T232200Z"],
  },
  {
    path: "/admin/batch",
    label: "admin-batch",
    heading: "Batch",
    requiredText: ["Reviewed cohort batch facts", "Runs in this reviewed cohort", "matches this review", "20260416T134500Z"],
  },
  {
    path: "/admin/handoff",
    label: "admin-handoff",
    heading: "Handoff",
    requiredText: [
      "Reviewer receipt context",
      "Package ZIP",
      "Batch ZIP",
      "STRATEGY_RUN_BATCH 20260416T134500Z 20260416T134500Z",
    ],
  },
];

const downloadPaths = [
  "/downloads/STRATEGY_RUN_PACKAGE__20260414T232200Z__20260416T134500Z.zip",
  "/downloads/STRATEGY_RUN_BATCH__20260416T134500Z__20260416T134500Z.zip",
  "/downloads/CANONICAL_POINTER__SSOT_LATEST.txt",
  "/downloads/CANONICAL_SHA256__SSOT_LATEST.txt",
];

const signedOutPaths = [
  "/",
  "/workspace",
  "/intake",
  "/drafts",
  "/calendar",
  "/results",
  "/review",
  "/strategy",
  "/package",
  "/batch",
  "/handoff",
  "/admin/package",
  "/admin/batch",
  "/admin/handoff",
];

const viewports: ViewportCheck[] = [
  { label: "desktop", width: 1440, height: 960 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 390, height: 844 },
  { label: "narrow-mobile", width: 360, height: 740 },
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

function isInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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

async function assertResponsiveSizing(page: Page, routeLabel: string, viewportLabel: string) {
  const result = await page.evaluate(() => {
    const runtime = globalThis as unknown as {
      innerWidth: number;
      document: {
        documentElement: { scrollWidth: number };
        body: { scrollWidth: number };
        querySelectorAll: (selector: string) => ArrayLike<{
          clientWidth: number;
          scrollWidth: number;
          getBoundingClientRect: () => { width: number };
        }>;
      };
      getComputedStyle: (element: unknown) => { overflowX: string };
    };
    const tolerancePx = 2;
    const viewportWidth = runtime.innerWidth;
    const documentWidth = Math.max(runtime.document.documentElement.scrollWidth, runtime.document.body.scrollWidth);
    const bodyOverflowPx = documentWidth - viewportWidth;
    const tableFailures: string[] = [];
    const tableScrolls = Array.from(runtime.document.querySelectorAll(".table-scroll"));

    tableScrolls.forEach((container, index) => {
      const rect = container.getBoundingClientRect();
      const style = runtime.getComputedStyle(container);
      const hasInternalOverflow = container.scrollWidth > container.clientWidth + tolerancePx;
      const canScrollInternally = style.overflowX === "auto" || style.overflowX === "scroll";

      if (rect.width > viewportWidth + tolerancePx) {
        tableFailures.push(`table-scroll[${index}] container width ${Math.round(rect.width)} exceeds viewport ${viewportWidth}`);
      }
      if (hasInternalOverflow && !canScrollInternally) {
        tableFailures.push(`table-scroll[${index}] has horizontal overflow without internal scrolling`);
      }
    });

    return {
      bodyOverflowPx,
      tableFailures,
      viewportWidth,
      documentWidth,
    };
  });

  if (result.bodyOverflowPx > 2) {
    throw new Error(
      `${routeLabel} at ${viewportLabel} has document-level horizontal overflow: ` +
        `${Math.round(result.bodyOverflowPx)}px (${result.documentWidth}px document / ${result.viewportWidth}px viewport).`,
    );
  }

  if (result.tableFailures.length > 0) {
    throw new Error(`${routeLabel} at ${viewportLabel} has table sizing failures:\n${result.tableFailures.join("\n")}`);
  }
}

async function runRouteCheck(page: Page, route: RouteCheck, viewportLabel: string): Promise<ScreenshotReceipt> {
  await page.goto(urlFor(route.path), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: route.heading, exact: true }).first().waitFor({ timeout: 10_000 });
  if (route.label === "workspace") {
    const showGuide = page.getByRole("button", { name: "Show guide" });
    if (await showGuide.isVisible().catch(() => false)) {
      await showGuide.click();
    }
  }
  await assertNoRequiredDataFailure(page, route);

  for (const text of route.requiredText) {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
  }

  await assertResponsiveSizing(page, route.label, viewportLabel);

  const screenshot = path.join(outputDir, `${viewportLabel}-${sanitizeLabel(route.label)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return { viewport: viewportLabel, route: route.path, screenshot };
}

async function runSignedOutGateCheck(page: Page, pathname: string, viewportLabel: string): Promise<ScreenshotReceipt> {
  await page.goto(urlFor(pathname), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Sign in to Algo-Rhythm", exact: true }).first().waitFor({ timeout: 15_000 });
  await page.getByText("Clerk UI gate", { exact: false }).first().waitFor({ timeout: 10_000 });
  await page.locator('input[name="identifier"]').waitFor({ state: "visible", timeout: 10_000 });
  await page.locator('input[name="password"]').waitFor({ state: "visible", timeout: 10_000 });
  await page.getByRole("button", { name: "Continue", exact: true }).waitFor({ timeout: 10_000 });
  if (expectClerkGoogleOption) {
    await page.locator("button", { hasText: "Continue with Google" }).waitFor({ state: "visible", timeout: 10_000 });
  }

  const dashboardHeadingVisible = await page.getByRole("heading", { name: "Overview", exact: true }).isVisible().catch(() => false);
  if (dashboardHeadingVisible) {
    throw new Error(`${pathname} rendered dashboard content while signed out.`);
  }

  await assertResponsiveSizing(page, pathname, viewportLabel);

  const screenshot = path.join(outputDir, `${viewportLabel}-signed-out-${sanitizeLabel(pathname === "/" ? "root" : pathname)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return { viewport: viewportLabel, route: pathname, screenshot };
}

async function assertSignedInAuthRedirect(page: Page) {
  await page.goto(urlFor("/sign-in"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForURL(/\/workspace(?:$|[?#])/, { timeout: 15_000 });
  await page.getByRole("heading", { name: "Home", exact: true }).waitFor({ timeout: 10_000 });
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
  await page.getByLabel("Category 1").selectOption("contract_gap");
  await page.getByText("Static dashboard data is missing, inconsistent, or contradicts the review contract.", {
    exact: true,
  }).waitFor({ timeout: 5_000 });
  await page.getByRole("textbox", { name: "Summary", exact: true }).fill("Browser QA confirms reviewer workspace is usable");
  await page.getByRole("textbox", { name: "Detail", exact: true }).fill(
    "The signed-in reviewer can classify feedback and export a local receipt without network writes.",
  );
  await page.getByLabel("Reviewer notes").fill("Signed-in QA completed the reviewer workspace workflow.");
  await page.getByLabel("This review still needed operator explanation.").check();

  const jsonButton = page.getByRole("button", { name: "Download JSON receipt" });
  const markdownButton = page.getByRole("button", { name: "Download Markdown summary" });
  await page.getByText("1 missing", { exact: false }).waitFor({ timeout: 5_000 });
  if (!(await jsonButton.isDisabled())) {
    throw new Error("JSON receipt export was enabled before downloaded-artifact acknowledgement.");
  }
  if (!(await markdownButton.isDisabled())) {
    throw new Error("Markdown receipt export was enabled before downloaded-artifact acknowledgement.");
  }
  await page.getByLabel(/I understand the package, batch, JSON receipt/).check();
  await page.getByText("ready to export", { exact: false }).waitFor({ timeout: 5_000 });
  if (await jsonButton.isDisabled()) {
    throw new Error("JSON receipt export remained disabled after required fields were complete.");
  }
  if (await markdownButton.isDisabled()) {
    throw new Error("Markdown receipt export remained disabled after required fields were complete.");
  }

  const [jsonDownload] = await Promise.all([
    page.waitForEvent("download"),
    jsonButton.click(),
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
  if (receipt.completion_status !== "complete") {
    throw new Error(`Unexpected receipt completion_status ${receipt.completion_status}`);
  }
  if (!Array.isArray(receipt.missing_required_fields) || receipt.missing_required_fields.length !== 0) {
    throw new Error(`Unexpected missing_required_fields ${JSON.stringify(receipt.missing_required_fields)}`);
  }
  if (receipt.downloaded_artifacts_acknowledged !== true) {
    throw new Error("Receipt did not acknowledge downloaded artifacts.");
  }
  if (receipt.needs_operator_explanation !== true) {
    throw new Error("Receipt did not capture the operator-explanation flag.");
  }
  if (receipt.issues?.[0]?.category !== "contract_gap") {
    throw new Error("Receipt did not include the browser QA issue category.");
  }

  const [markdownDownload] = await Promise.all([
    page.waitForEvent("download"),
    markdownButton.click(),
  ]);
  if (!markdownDownload.suggestedFilename().endsWith(".md")) {
    throw new Error(`Expected Markdown receipt download, received ${markdownDownload.suggestedFilename()}`);
  }
  const markdownPath = await markdownDownload.path();
  if (!markdownPath) throw new Error("Markdown receipt download did not produce a local path.");
  const markdown = await fs.promises.readFile(markdownPath, "utf8");
  for (const expected of [
    "Completion status: `complete`",
    "Decision: `accept_with_notes`",
    "Selected run: `20260414T232200Z`",
    "Browser QA confirms reviewer workspace is usable",
    "contract_gap",
    "Signed-in QA completed the reviewer workspace workflow.",
    "Needs operator explanation: `yes`",
  ]) {
    if (!markdown.includes(expected)) {
      throw new Error(`Markdown receipt missing ${expected}`);
    }
  }
}

async function runStrategyWorkspaceCheck(page: Page) {
  await page.goto(urlFor("/workspace"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("algo-rhythm:strategy-workspace:"))
      .forEach((key) => localStorage.removeItem(key));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Home", exact: true }).waitFor({ timeout: 10_000 });
  for (const label of ["Home", "Check Idea", "Edit Drafts", "Pick Schedule", "Track Results", "Review Approval"]) {
    await page.getByText(label, { exact: true }).first().waitFor({ timeout: 10_000 });
  }
  await page.getByText("Make a posting plan in 5 steps.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Hide this guide" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("button", { name: "Show guide" }).waitFor({ timeout: 10_000 });
  if (await page.getByText("Make a posting plan in 5 steps.", { exact: true }).isVisible().catch(() => false)) {
    throw new Error("Onboarding guide remained visible after dismissal and reload.");
  }
  await page.getByRole("button", { name: "Show guide" }).click();
  await page.getByText("Make a posting plan in 5 steps.", { exact: true }).waitFor({ timeout: 10_000 });

  const earlyJsonButton = page.getByRole("button", { name: "Download JSON Plan" });
  await page.getByText("You can still download, but these items are not done yet.", { exact: true }).waitFor({ timeout: 10_000 });
  if (!(await earlyJsonButton.isDisabled())) {
    throw new Error("Strategy JSON export was enabled before local file acknowledgement.");
  }
  await page.getByLabel("I understand this is a local file. I will use it or send it by hand.").check();
  if (await earlyJsonButton.isDisabled()) {
    throw new Error("Strategy JSON export stayed disabled after acknowledgement while fields were incomplete.");
  }
  await page.getByLabel("I understand this is a local file. I will use it or send it by hand.").uncheck();

  await page.getByLabel("Getting started guide").getByRole("button", { name: "Start: Check Idea" }).click();
  await page.waitForURL(/\/intake(?:$|[?#])/, { timeout: 10_000 });
  await page.getByRole("heading", { name: "Check Idea", exact: true }).first().waitFor({ timeout: 10_000 });

  const projectName = `Browser QA strategy ${Date.now()}`;
  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Offer").fill("A reusable social planning checklist");
  await page.getByLabel("Audience").fill("Solo operators testing manual social strategy");
  await page.getByLabel("Primary CTA").fill("Download the checklist and run the manual test.");
  await page.getByLabel("Tone notes").fill("Practical, specific, and calm.");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByLabel("Project name").waitFor({ timeout: 10_000 });
  const persistedName = await page.getByLabel("Project name").inputValue();
  if (persistedName !== projectName) {
    throw new Error(`Workspace localStorage did not persist project name: ${persistedName}`);
  }

  await page.goto(urlFor("/drafts"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Edit Drafts", exact: true }).first().waitFor({ timeout: 10_000 });
  await page.getByRole("textbox", { name: "Draft notes" }).first().fill("Use a direct opening and keep the asset manual.");
  await page.getByRole("button", { name: "Copy Draft", exact: true }).first().click();
  await page.getByRole("button", { name: "Copied", exact: true }).first().waitFor({ timeout: 5_000 });

  await page.goto(urlFor("/calendar"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Pick Schedule", exact: true }).first().waitFor({ timeout: 10_000 });
  await page.getByLabel("Date").first().fill("2026-04-20");
  await page.getByLabel("Time").first().fill("09:30");
  await page.getByLabel("Schedule notes").first().fill("Post after final manual review.");

  await page.goto(urlFor("/results"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Track Results", exact: true }).first().waitFor({ timeout: 10_000 });
  await page.getByRole("spinbutton", { name: "Impressions" }).first().fill("1234");
  await page.getByRole("spinbutton", { name: "Saves" }).first().fill("56");
  await page.getByRole("textbox", { name: "Qualitative notes" }).first().fill("Manual result logging works for the first platform.");

  await page.goto(urlFor("/workspace"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.getByRole("heading", { name: "Home", exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Idea checked", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("At least one draft reviewed", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Schedule added", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Results notes added", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Go to Idea", exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Go to Drafts", exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Go to Schedule", exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Go to Results", exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Go to Download", exact: true }).waitFor({ timeout: 10_000 });
  const strategyJsonButton = page.getByRole("button", { name: "Download JSON Plan" });
  const strategyMarkdownButton = page.getByRole("button", { name: "Download Markdown Plan" });
  if (!(await strategyJsonButton.isDisabled())) {
    throw new Error("Strategy JSON export was enabled before local export acknowledgement.");
  }
  await page.getByLabel("I understand this is a local file. I will use it or send it by hand.").check();
  if (await strategyJsonButton.isDisabled()) {
    throw new Error("Strategy JSON export remained disabled after local export acknowledgement.");
  }

  const [jsonDownload] = await Promise.all([
    page.waitForEvent("download"),
    strategyJsonButton.click(),
  ]);
  if (!jsonDownload.suggestedFilename().endsWith(".json")) {
    throw new Error(`Expected strategy JSON download, received ${jsonDownload.suggestedFilename()}`);
  }
  const jsonPath = await jsonDownload.path();
  if (!jsonPath) throw new Error("Strategy JSON download did not produce a local path.");
  const receipt = JSON.parse(await fs.promises.readFile(jsonPath, "utf8"));
  if (receipt.schema_version !== "strategy_workspace_v1") {
    throw new Error(`Unexpected strategy schema ${receipt.schema_version}`);
  }
  if (receipt.project?.name !== projectName) {
    throw new Error(`Strategy JSON missing edited project name ${projectName}`);
  }
  if (receipt.intake?.offer !== "A reusable social planning checklist") {
    throw new Error("Strategy JSON missing edited offer.");
  }
  if (!receipt.platform_drafts?.some((draft: { notes?: string }) => draft.notes?.includes("direct opening"))) {
    throw new Error("Strategy JSON missing edited draft notes.");
  }
  if (!receipt.calendar_items?.some((item: { date?: string }) => item.date === "2026-04-20")) {
    throw new Error("Strategy JSON missing edited calendar date.");
  }
  if (!receipt.result_logs?.some((item: { impressions?: string }) => item.impressions === "1234")) {
    throw new Error("Strategy JSON missing edited result metrics.");
  }

  const [markdownDownload] = await Promise.all([
    page.waitForEvent("download"),
    strategyMarkdownButton.click(),
  ]);
  if (!markdownDownload.suggestedFilename().endsWith(".md")) {
    throw new Error(`Expected strategy Markdown download, received ${markdownDownload.suggestedFilename()}`);
  }
  const markdownPath = await markdownDownload.path();
  if (!markdownPath) throw new Error("Strategy Markdown download did not produce a local path.");
  const markdown = await fs.promises.readFile(markdownPath, "utf8");
  for (const expected of [
    "Algo-Rhythm Strategy Workspace Export",
    projectName,
    "A reusable social planning checklist",
    "Platform Drafts",
    "Posting Schedule",
    "Manual Test Plan",
    "Results Notes",
  ]) {
    if (!markdown.includes(expected)) {
      throw new Error(`Strategy Markdown missing ${expected}`);
    }
  }
}

async function main() {
  ensureDir(outputDir);
  if (authMode === "signed-in" && !storageState) {
    throw new Error(
      `DASHBOARD_QA_STORAGE_STATE is required when DASHBOARD_QA_AUTH_MODE=signed-in, ` +
        `or create the default private state with qa:dashboard:auth:record at ${defaultStorageState}.`,
    );
  }
  if (storageState && isInside(path.resolve(storageState), repoRoot)) {
    throw new Error(`Refusing to use Playwright storage state inside the Git checkout: ${storageState}`);
  }

  const browserPath = resolveAutomationBrowserPath();
  const baseOrigin = new URL(baseUrl).origin;
  const browser = await chromium.launch({
    headless: !headed,
    executablePath: browserPath,
    args: hostResolverRules ? [`--host-resolver-rules=${hostResolverRules}`] : [],
  });
  const consoleErrors: string[] = [];
  const appWriteRequests: string[] = [];
  const screenshots: ScreenshotReceipt[] = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        acceptDownloads: true,
        ...(storageState ? { storageState } : {}),
      });
      const page = await context.newPage();
      page.on("request", (request) => {
        const method = request.method().toUpperCase();
        if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
        const requestUrl = request.url();
        try {
          if (new URL(requestUrl).origin === baseOrigin) {
            appWriteRequests.push(`[${viewport.label}] ${method} ${requestUrl}`);
          }
        } catch {
          appWriteRequests.push(`[${viewport.label}] ${method} ${requestUrl}`);
        }
      });
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(`[${viewport.label}] ${message.text()}`);
      });

      if (authMode === "signed-out") {
        for (const pathname of signedOutPaths) {
          screenshots.push(await runSignedOutGateCheck(page, pathname, viewport.label));
        }
      } else {
        if (viewport.label === "desktop") {
          await assertSignedInAuthRedirect(page);
        }
        for (const route of routes) {
          screenshots.push(await runRouteCheck(page, route, viewport.label));
        }
        if (viewport.label === "desktop") {
          await runStrategyWorkspaceCheck(page);
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

  if (appWriteRequests.length > 0) {
    throw new Error(`Unexpected write requests to the dashboard origin:\n${appWriteRequests.join("\n")}`);
  }

  const receipt = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    browser_path: browserPath,
    host_resolver_rules_used: Boolean(hostResolverRules),
    auth_mode: authMode,
    storage_state_used: Boolean(storageState),
    storage_state_source:
      storageState === defaultStorageState ? "default-private-path" : storageState ? "explicit-env" : "none",
    auth_expectations: {
      email_password_sign_in_required: true,
      clerk_google_option_required: expectClerkGoogleOption,
    },
    viewports,
    responsive_checks: {
      document_level_horizontal_overflow: "blocked",
      table_overflow_policy: "internal .table-scroll overflow only",
    },
    network_write_check: {
      dashboard_origin: baseOrigin,
      write_requests_to_dashboard_origin: appWriteRequests.length,
    },
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
