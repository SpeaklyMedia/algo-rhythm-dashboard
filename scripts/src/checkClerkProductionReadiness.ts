import dns from "node:dns/promises";
import https from "node:https";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CheckResult = {
  ok: boolean;
  detail: string;
};

const clerkHosts = [
  {
    host: "clerk.algo.mrksylvstr.com",
    expectedCname: "frontend-api.clerk.services",
  },
  {
    host: "accounts.algo.mrksylvstr.com",
    expectedCname: "accounts.clerk.services",
  },
];

const dashboardIndexUrl = "https://algo.mrksylvstr.com/data/dashboard_index.json";
const vercelScope = process.env.VERCEL_SCOPE ?? "marks-projects-f03fd1cc";
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function normalizeDnsName(value: string): string {
  return value.replace(/\.$/, "").toLowerCase();
}

async function checkCname(host: string, expectedCname: string): Promise<CheckResult> {
  try {
    const records = (await dns.resolveCname(host)).map(normalizeDnsName);
    const expected = normalizeDnsName(expectedCname);
    const ok = records.includes(expected);
    return {
      ok,
      detail: ok ? records.join(", ") : `expected ${expected}; got ${records.join(", ") || "none"}`,
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkTls(host: string): Promise<CheckResult> {
  return new Promise((resolve) => {
    const request = https.request(
      {
        host,
        method: "HEAD",
        path: "/",
        servername: host,
        timeout: 10_000,
      },
      (response) => {
        response.resume();
        resolve({
          ok: true,
          detail: `HTTP ${response.statusCode ?? "unknown"}`,
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("TLS check timed out"));
    });

    request.on("error", (error) => {
      resolve({
        ok: false,
        detail: error.message,
      });
    });

    request.end();
  });
}

async function checkDashboardContract(): Promise<CheckResult> {
  try {
    const response = await fetch(dashboardIndexUrl);
    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status}` };
    }

    const dashboardIndex = await response.json() as {
      review_mode?: {
        review_mode?: string;
        cohort_size?: number;
        recommended_run_id?: string;
      };
    };
    const reviewMode = dashboardIndex.review_mode;
    const ok =
      reviewMode?.review_mode === "multi_run_review" &&
      reviewMode.cohort_size === 4 &&
      reviewMode.recommended_run_id === "20260414T232200Z";

    return {
      ok,
      detail: ok
        ? "multi_run_review 4 20260414T232200Z"
        : JSON.stringify(reviewMode ?? null),
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkVercelEnv(): CheckResult {
  const result = spawnSync("vercel", ["env", "ls", "--scope", vercelScope], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "vercel env ls failed").trim().split("\n").slice(-1)[0];
    return { ok: false, detail };
  }

  const ok = result.stdout.includes("VITE_CLERK_PUBLISHABLE_KEY");
  return {
    ok,
    detail: ok ? "VITE_CLERK_PUBLISHABLE_KEY present; value not printed" : "VITE_CLERK_PUBLISHABLE_KEY not listed",
  };
}

async function main() {
  const results: Record<string, CheckResult> = {};

  for (const { host, expectedCname } of clerkHosts) {
    results[`dns:${host}`] = await checkCname(host, expectedCname);
    results[`tls:${host}`] = await checkTls(host);
  }

  results["vercel:env"] = checkVercelEnv();
  results["dashboard:contract"] = await checkDashboardContract();

  const ready = Object.values(results).every((result) => result.ok);

  process.stdout.write(JSON.stringify({
    ready,
    checked_at: new Date().toISOString(),
    results,
  }, null, 2));
  process.stdout.write("\n");

  if (!ready) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
