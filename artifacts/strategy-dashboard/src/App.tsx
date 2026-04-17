// @ts-nocheck
import { ClerkLoaded, ClerkLoading, ClerkProvider, Show, SignIn, SignUp, UserButton } from '@clerk/react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

const PAGE_ORDER = ['workspace', 'intake', 'drafts', 'calendar', 'results', 'review'];
const AUTH_PATHS = ['/sign-in', '/sign-up'];
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const workspaceRedirectUrl = `${basePath || ''}/workspace`;

const PAGE_PATHS = {
  workspace: '/workspace',
  intake: '/intake',
  drafts: '/drafts',
  calendar: '/calendar',
  results: '/results',
  review: '/review',
  overview: '/',
  strategy: '/strategy',
  adminPackage: '/admin/package',
  adminBatch: '/admin/batch',
  adminHandoff: '/admin/handoff',
};

const PAGE_DATA_KEYS = {
  workspace: ['content_object', 'four_tier_adaptations', 'experiment_plan', 'campaign_ledger_seed'],
  intake: ['content_object'],
  drafts: ['content_object', 'four_tier_adaptations'],
  calendar: ['content_object', 'experiment_plan'],
  results: ['content_object', 'experiment_plan'],
  overview: ['latest_run', 'latest_review', 'latest_package', 'latest_batch'],
  strategy: ['content_object', 'trend_shortlist', 'platform_signal_selection', 'viability_scorecard', 'four_tier_adaptations', 'experiment_plan', 'campaign_ledger_seed'],
  review: ['promotion_recommendation', 'run_comparison_scorecard', 'run_review_index'],
  adminPackage: ['latest_package', 'package_manifest'],
  adminBatch: ['latest_batch', 'batch_manifest'],
  adminHandoff: [],
};

const REVIEW_DECISIONS = [
  { id: 'accept_recommended', label: 'Accept recommended plan' },
  { id: 'accept_with_notes', label: 'Accept with notes' },
  { id: 'reject_recommendation', label: 'Reject recommendation' },
  { id: 'needs_operator_review', label: 'Needs more review' },
];

const ISSUE_CATEGORY_OPTIONS = [
  {
    id: 'usability_feedback',
    label: 'Usability feedback',
    detail: 'UI, wording, flow, or comprehension feedback.',
  },
  {
    id: 'content_quality_feedback',
    label: 'Content quality feedback',
    detail: 'Strategy quality, evidence quality, or output usefulness feedback.',
  },
  {
    id: 'contract_gap',
    label: 'Contract gap',
    detail: 'Static dashboard data is missing, inconsistent, or contradicts the review contract.',
  },
  {
    id: 'handoff_packet_gap',
    label: 'Handoff packet gap',
    detail: 'A required handoff/download/instruction surface is missing or unusable.',
  },
  {
    id: 'operational_regression',
    label: 'Operational regression',
    detail: 'Something expected to work is broken, such as login, routing, downloads, or receipt export.',
  },
];

const REVIEW_CHECKLIST = [
  ['state_model_understood', 'State model understood'],
  ['recommendation_understood', 'Recommendation understood'],
  ['package_reviewed', 'Package reviewed'],
  ['batch_reviewed', 'Batch reviewed'],
  ['handoff_chain_trusted', 'Handoff/download chain trusted'],
];

function pageHasData(pageId, datasets) {
  const keys = PAGE_DATA_KEYS[pageId] || [];
  if (keys.length === 0) return true;
  return keys.some((key) => datasets[key] != null);
}

function pageFromPathname(pathname) {
  const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (normalized === '/') return 'workspace';
  const routeMap = {
    '/workspace': 'workspace',
    '/intake': 'intake',
    '/drafts': 'drafts',
    '/calendar': 'calendar',
    '/results': 'results',
    '/review': 'review',
    '/overview': 'overview',
    '/strategy': 'strategy',
    '/package': 'adminPackage',
    '/batch': 'adminBatch',
    '/handoff': 'adminHandoff',
    '/admin/package': 'adminPackage',
    '/admin/batch': 'adminBatch',
    '/admin/handoff': 'adminHandoff',
  };
  return routeMap[normalized] || 'workspace';
}

function stripBase(path) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function normalizedLocationPath() {
  if (typeof window === 'undefined') return '/';
  return stripBase(window.location.pathname).replace(/\/+$/, '') || '/';
}

function currentPageFromLocation() {
  if (typeof window === 'undefined') return 'overview';
  return pageFromPathname(normalizedLocationPath());
}

function isAuthPath(pathname) {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function pushAppPath(pathname, replace = false) {
  if (typeof window === 'undefined') return;
  const next = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const nextPath = `${basePath}${next === '/' ? '/' : next}`;
  if (window.location.pathname === nextPath) return;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', nextPath);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const STRIP_ICONS = {
  promoted: 'LIVE',
  latest: 'LATEST',
  recommended: 'PICK',
  package: 'FILE',
  properties: 'PROPS',
};

const PAGE_DISPLAY = {
  workspace: {
    label: 'Home',
    shortLabel: 'Home',
    subtitle: 'Start here · see your progress · download your plan',
    kicker: 'Posting plan',
  },
  intake: {
    label: 'Check Idea',
    shortLabel: 'Idea',
    subtitle: 'Check the idea, audience, offer, and goal',
    kicker: 'Step 1',
  },
  drafts: {
    label: 'Edit Drafts',
    shortLabel: 'Drafts',
    subtitle: 'Edit the words you want to use',
    kicker: 'Step 2',
  },
  calendar: {
    label: 'Pick Schedule',
    shortLabel: 'Schedule',
    subtitle: 'Pick when and where to post by hand',
    kicker: 'Step 3',
  },
  results: {
    label: 'Track Results',
    shortLabel: 'Results',
    subtitle: 'Write down what happened after posting',
    kicker: 'Step 4',
  },
  overview: {
    label: 'Internal Overview',
    shortLabel: 'Internal',
    subtitle: 'Promoted alias · review mode · recommendation · package and batch pointers',
    kicker: 'Lane B delivery posture',
  },
  strategy: {
    label: 'Strategy',
    shortLabel: 'Strategy',
    subtitle: 'Content object · trends · viability scorecard · platform decisions · experiment plan',
    kicker: 'Strategic substrate',
  },
  review: {
    label: 'Review Approval',
    shortLabel: 'Review',
    subtitle: 'Optional approval files to share by hand',
    kicker: 'Approval',
  },
  adminPackage: {
    label: 'Package',
    shortLabel: 'Package',
    subtitle: 'Latest package facts · manifest integrity · selected signal cards by property',
    kicker: 'Latest package',
  },
  adminBatch: {
    label: 'Batch',
    shortLabel: 'Batch',
    subtitle: 'Single-run batch or reviewed cohort · package modes · card counts · SHA verification',
    kicker: 'Latest batch',
  },
  adminHandoff: {
    label: 'Handoff',
    shortLabel: 'Handoff',
    subtitle: 'Canonical downloads · contract metadata · design authority · handoff packet',
    kicker: 'Canonical handoff',
  },
};

const WORKFLOW_STEPS = [
  {
    id: 'intake',
    pageId: 'intake',
    number: 1,
    label: 'Check Idea',
    shortLabel: 'Idea',
    actionLabel: 'Go to Idea',
    purpose: 'Use this page to make sure the idea, audience, offer, and goal are right.',
    todo: 'Change any field that sounds wrong or unclear.',
    next: 'Next, edit the drafts for each platform.',
    willNot: 'This page does not send or post anything.',
  },
  {
    id: 'drafts',
    pageId: 'drafts',
    number: 2,
    label: 'Edit Drafts',
    shortLabel: 'Drafts',
    actionLabel: 'Go to Drafts',
    purpose: 'Use this page to edit starter text for each platform.',
    todo: 'Change the words, add notes, then use Copy Draft when you are ready.',
    next: 'Next, pick when you want to post.',
    willNot: 'Copying a draft does not post it.',
  },
  {
    id: 'calendar',
    pageId: 'calendar',
    number: 3,
    label: 'Pick Schedule',
    shortLabel: 'Schedule',
    actionLabel: 'Go to Schedule',
    purpose: 'Use this page to plan when you will post by hand.',
    todo: 'Pick a date, time, platform, and status.',
    next: 'Next, come back here or track results after you post.',
    willNot: 'This page does not connect to a calendar or social account.',
  },
  {
    id: 'results',
    pageId: 'results',
    number: 4,
    label: 'Track Results',
    shortLabel: 'Results',
    actionLabel: 'Go to Results',
    purpose: 'Use this page to type in what happened after you post.',
    todo: 'Add numbers and short notes for each platform.',
    next: 'Next, download your plan when you are ready to save or share it.',
    willNot: 'This page does not pull results from social platforms.',
  },
  {
    id: 'download',
    pageId: 'workspace',
    number: 5,
    label: 'Download Plan',
    shortLabel: 'Download',
    actionLabel: 'Go to Download',
    purpose: 'Use this section to download files you can keep or send.',
    todo: 'Check the box, then download JSON or Markdown.',
    next: 'After download, use the files by hand.',
    willNot: 'Downloading does not send the plan to anyone.',
  },
];

function hasText(value) {
  return String(value || '').trim().length > 0;
}

function isStepPage(pageId) {
  return pageId === 'workspace' || WORKFLOW_STEPS.some((step) => step.pageId === pageId);
}

function getWorkflowStepForPage(pageId) {
  if (pageId === 'workspace') return WORKFLOW_STEPS[4];
  return WORKFLOW_STEPS.find((step) => step.pageId === pageId) || null;
}

function getNextStep(activePage) {
  if (activePage === 'workspace') return WORKFLOW_STEPS[0];
  const current = WORKFLOW_STEPS.findIndex((step) => step.pageId === activePage);
  return current >= 0 && current < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[current + 1] : WORKFLOW_STEPS[4];
}

function getPreviousStep(activePage) {
  if (activePage === 'workspace' || activePage === 'intake') return null;
  const current = WORKFLOW_STEPS.findIndex((step) => step.pageId === activePage);
  return current > 0 ? WORKFLOW_STEPS[current - 1] : null;
}

function getWorkspaceProgress(draft) {
  const intakeDone = Boolean(
    hasText(draft.intake?.source_idea) &&
    hasText(draft.intake?.audience) &&
    hasText(draft.intake?.goal) &&
    asArray(draft.intake?.target_platforms).length > 0
  );
  const intakeStarted = Boolean(
    hasText(draft.intake?.source_idea) ||
    hasText(draft.intake?.audience) ||
    hasText(draft.intake?.offer) ||
    hasText(draft.intake?.goal) ||
    asArray(draft.intake?.target_platforms).length > 0
  );
  const draftReviewed = asArray(draft.platform_drafts).some((item) => hasText(item.notes));
  const draftsStarted = asArray(draft.platform_drafts).some((item) => hasText(item.draft_copy) || hasText(item.notes));
  const scheduleAdded = asArray(draft.calendar_items).some((item) => hasText(item.date) || hasText(item.time) || hasText(item.notes));
  const resultsAdded = asArray(draft.result_logs).some((item) => (
    hasText(item.impressions) ||
    hasText(item.saves) ||
    hasText(item.clicks) ||
    hasText(item.replies_comments) ||
    hasText(item.reposts_shares) ||
    hasText(item.conversions) ||
    hasText(item.qualitative_notes)
  ));
  const exportAcknowledged = Boolean(draft.export_status?.acknowledged);
  const exported = Boolean(draft.export_status?.last_exported_at);

  return {
    intake: {
      done: intakeDone,
      started: intakeStarted,
      status: intakeDone ? 'Done' : intakeStarted ? 'Started' : 'Needs info',
    },
    drafts: {
      done: draftReviewed,
      started: draftsStarted,
      status: draftReviewed ? 'Done' : draftsStarted ? 'Started' : 'Needs info',
    },
    calendar: {
      done: scheduleAdded,
      started: scheduleAdded,
      status: scheduleAdded ? 'Done' : 'Not started',
    },
    results: {
      done: resultsAdded,
      started: resultsAdded,
      status: resultsAdded ? 'Done' : 'Not started',
    },
    download: {
      done: exported,
      started: exportAcknowledged,
      status: exported ? 'Done' : exportAcknowledged ? 'Started' : 'Not started',
    },
  };
}

function progressTone(status) {
  if (status === 'Done') return 'good';
  if (status === 'Needs info') return 'bad';
  if (status === 'Started') return 'warn';
  return 'neutral';
}

function getReviewModeMeta(index, datasets = {}) {
  const explicit = index?.review_mode;
  if (explicit && typeof explicit === 'object') return explicit;
  const recommendation = datasets.promotion_recommendation || {};
  const latestReview = datasets.latest_review || {};
  const latestBatch = datasets.latest_batch || {};
  const includedRunIds = recommendation.included_run_ids || recommendation.reviewed_run_ids || latestBatch.included_run_ids || [];
  const reviewMode = recommendation.review_mode || latestReview.review_mode || (includedRunIds.length > 1 ? 'multi_run_review' : 'beta_single_run');
  return {
    review_mode: reviewMode,
    review_scope: recommendation.review_scope || latestReview.review_scope || (reviewMode === 'multi_run_review' ? 'reviewed_run_cohort' : 'single_refresh_snapshot'),
    cohort_size: recommendation.cohort_size || latestReview.cohort_size || includedRunIds.length || 0,
    recommended_run_id: recommendation.recommended_run_id || latestReview.recommended_run_id || null,
    included_run_ids: includedRunIds,
  };
}

function isSingleRunMode(reviewModeMeta) {
  return reviewModeMeta?.review_mode === 'beta_single_run';
}

function reviewModeLabel(reviewModeMeta) {
  return isSingleRunMode(reviewModeMeta) ? 'beta single-run' : 'multi-run review';
}

function formatDate(value) {
  if (!value) return 'Unavailable';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function formatDateShort(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  return new Intl.NumberFormat().format(value);
}

function sameStringSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getWorkspaceSourceId(datasets = {}) {
  return datasets.content_object?.content_id
    || datasets.content_object?.brief_ref
    || datasets.latest_review?.recommended_run_id
    || 'static_strategy_sample';
}

function getAdaptationTiers(datasets = {}) {
  const adaptations = datasets.four_tier_adaptations;
  if (Array.isArray(adaptations?.tiers)) return adaptations.tiers;
  if (Array.isArray(adaptations)) return adaptations;
  return [];
}

function getDefaultWorkspaceTier(datasets = {}) {
  const tiers = getAdaptationTiers(datasets);
  return tiers.find((tier) => tier.tier_id === 'T3_NATIVE') || tiers[0] || null;
}

function getTierById(datasets = {}, tierId) {
  const tiers = getAdaptationTiers(datasets);
  return tiers.find((tier) => tier.tier_id === tierId) || getDefaultWorkspaceTier(datasets);
}

function plainStarterText(value) {
  return String(value || '')
    .replace(/\boperator-reviewed\b/gi, 'reviewed by a person')
    .replace(/\boperator pain point\b/gi, 'creator pain point')
    .replace(/\bsmall business operators\b/gi, 'small business owners')
    .replace(/\boperators\b/gi, 'owners')
    .replace(/\boperator\b/gi, 'person')
    .replace(/\bsignal cards\b/gi, 'platform cues')
    .replace(/\btest package\b/gi, 'posting plan')
    .replace(/\bcampaign package\b/gi, 'campaign plan');
}

function draftStyleLabel(value) {
  return plainStarterText(String(value || 'custom').replace(/_/g, ' '));
}

function supportSignalLabel(id) {
  const labels = {
    META_UNCONNECTED_SHARE: 'Works for manual sharing',
    PLATFORM_NATIVE_REWRITE: 'Fits the platform',
    SOURCE_THESIS_REUSE: 'Keeps the main idea',
    LOW_RISK_CLAIMS: 'Avoids risky claims',
  };
  return labels[id] || plainStarterText(String(id || '').replace(/_/g, ' ').toLowerCase());
}

function buildDraftCopy(content, platformPlan) {
  const parts = [
    plainStarterText(platformPlan?.hook_direction),
    plainStarterText(content?.source_summary || content?.core_thesis),
    plainStarterText(platformPlan?.cta || content?.primary_cta),
  ].filter(Boolean);
  return parts.join('\n\n');
}

function buildPlatformDrafts(content, tier) {
  return asArray(tier?.per_platform).map((platformPlan) => ({
    platform: platformPlan.platform,
    tier_id: tier?.tier_id || 'custom',
    hook_direction: plainStarterText(platformPlan.hook_direction),
    format_shift: plainStarterText(platformPlan.format_shift),
    cta: plainStarterText(platformPlan.cta || content?.primary_cta),
    supporting_card_ids: asArray(platformPlan.supporting_card_ids),
    draft_copy: buildDraftCopy(content, platformPlan),
    notes: '',
  }));
}

function buildCalendarItems(platforms) {
  return asArray(platforms).map((platform, index) => ({
    id: `calendar_${String(platform).toLowerCase().replace(/[^a-z0-9]+/g, '_') || index}`,
    platform,
    date: '',
    time: '',
    status: 'planned',
    notes: '',
  }));
}

function buildResultLogs(platforms) {
  return asArray(platforms).map((platform, index) => ({
    id: `result_${String(platform).toLowerCase().replace(/[^a-z0-9]+/g, '_') || index}`,
    platform,
    impressions: '',
    saves: '',
    clicks: '',
    replies_comments: '',
    reposts_shares: '',
    conversions: '',
    qualitative_notes: '',
  }));
}

function buildInitialWorkspaceDraft(index = {}, datasets = {}) {
  const content = datasets.content_object || {};
  const tier = getDefaultWorkspaceTier(datasets);
  const platforms = asArray(content.target_platforms);
  const sourceId = getWorkspaceSourceId(datasets);

  return {
    workspace_id: `algo_strategy_workspace_${sourceId}`,
    source_content_id: sourceId,
    project: {
      name: content.title || 'Untitled social strategy',
      status: 'planning',
    },
    intake: {
      source_idea: plainStarterText(content.source_text || content.source_summary),
      audience: plainStarterText(content.audience),
      offer: plainStarterText(content.offer),
      goal: plainStarterText(content.operator_goal),
      primary_cta: plainStarterText(content.primary_cta),
      tone_notes: plainStarterText(content.brand_voice),
      constraints: plainStarterText(asArray(content.constraints).join('\n')),
      target_platforms: platforms,
    },
    selected_draft_tier: tier?.tier_id || '',
    platform_drafts: buildPlatformDrafts(content, tier),
    calendar_items: buildCalendarItems(platforms),
    result_logs: buildResultLogs(platforms),
    export_status: {
      acknowledged: false,
      last_exported_at: null,
    },
    generated_from: {
      dashboard_generated_at: index.generated_at || null,
      review_id: datasets.latest_review?.review_id || null,
      recommended_run_id: datasets.latest_review?.recommended_run_id || null,
    },
    updated_at: new Date().toISOString(),
  };
}

function mergeWorkspaceDraft(initial, saved) {
  const savedDraft = saved && typeof saved === 'object' ? saved : {};
  return {
    ...initial,
    ...savedDraft,
    project: { ...initial.project, ...(savedDraft.project || {}) },
    intake: { ...initial.intake, ...(savedDraft.intake || {}) },
    export_status: { ...initial.export_status, ...(savedDraft.export_status || {}) },
    platform_drafts: Array.isArray(savedDraft.platform_drafts) ? savedDraft.platform_drafts : initial.platform_drafts,
    calendar_items: Array.isArray(savedDraft.calendar_items) ? savedDraft.calendar_items : initial.calendar_items,
    result_logs: Array.isArray(savedDraft.result_logs) ? savedDraft.result_logs : initial.result_logs,
  };
}

function buildStrategyWorkspaceReceipt(draft) {
  return {
    schema_version: 'strategy_workspace_v1',
    exported_at: new Date().toISOString(),
    app_url: getAppUrl(),
    ...draft,
    export_status: {
      ...(draft.export_status || {}),
      acknowledged: Boolean(draft.export_status?.acknowledged),
      last_exported_at: new Date().toISOString(),
    },
  };
}

function buildStrategyWorkspaceMarkdown(receipt, datasets = {}) {
  const experiment = datasets.experiment_plan || {};
  const hypotheses = asArray(experiment.hypotheses);
  const draftRows = asArray(receipt.platform_drafts).map((draft) => `### ${draft.platform}

**Format:** ${draft.format_shift || 'Manual post'}

**Draft**

${draft.draft_copy || 'No draft copy recorded.'}

**Notes:** ${draft.notes || 'None'}
`).join('\n');
  const calendarRows = asArray(receipt.calendar_items).map((item) => (
    `- ${item.platform}: ${item.date || 'date TBD'} ${item.time || ''} · ${item.status || 'planned'} · ${item.notes || 'No notes'}`
  )).join('\n') || '- No calendar items recorded.';
  const resultRows = asArray(receipt.result_logs).map((item) => (
    `- ${item.platform}: impressions ${item.impressions || 'n/a'}, saves ${item.saves || 'n/a'}, clicks ${item.clicks || 'n/a'}, replies/comments ${item.replies_comments || 'n/a'}, reposts/shares ${item.reposts_shares || 'n/a'}, conversions ${item.conversions || 'n/a'}; notes: ${item.qualitative_notes || 'None'}`
  )).join('\n') || '- No results recorded.';
  const hypothesisRows = hypotheses.map((item) => `- ${item.platform}: ${item.hypothesis}`).join('\n') || '- No experiment hypotheses available.';

  return `# Algo-Rhythm Strategy Workspace Export

- Schema: \`${receipt.schema_version}\`
- Exported at: \`${receipt.exported_at}\`
- Workspace: \`${receipt.workspace_id}\`
- Project: ${receipt.project?.name || 'Untitled social strategy'}
- Status: ${receipt.project?.status || 'planning'}

## Intake

- Source idea: ${receipt.intake?.source_idea || 'Unavailable'}
- Audience: ${receipt.intake?.audience || 'Unavailable'}
- Offer: ${receipt.intake?.offer || 'None recorded'}
- Goal: ${receipt.intake?.goal || 'Unavailable'}
- Call to action: ${receipt.intake?.primary_cta || 'Unavailable'}
- Tone notes: ${receipt.intake?.tone_notes || 'Unavailable'}
- Platforms: ${(receipt.intake?.target_platforms || []).join(', ') || 'Unavailable'}
- Constraints: ${receipt.intake?.constraints || 'None recorded'}

## Platform Drafts

${draftRows || 'No platform drafts recorded.'}

## Posting Schedule

${calendarRows}

## Manual Test Plan

${hypothesisRows}

## Results Notes

${resultRows}
`;
}

function statusTone(value) {
  const normalized = String(value || '').toLowerCase();
  if (
    normalized.includes('pass') ||
    normalized.includes('ready') ||
    normalized.includes('promoted') ||
    normalized.includes('canonical')
  ) return 'good';
  if (
    normalized.includes('warn') ||
    normalized.includes('manual') ||
    normalized.includes('latest') ||
    normalized.includes('recommended')
  ) return 'warn';
  if (normalized.includes('fail') || normalized.includes('block') || normalized.includes('missing')) return 'bad';
  return 'neutral';
}

function StatusBadge({ children, tone }) {
  return <span className={`status status-${tone || statusTone(children)}`}>{children}</span>;
}

function MetricCard({ label, value, detail, tone }) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">
        <StatusBadge tone={tone}>{value}</StatusBadge>
      </p>
      {detail ? <p className="metric-detail">{detail}</p> : null}
    </article>
  );
}

function KeyValueTable({ rows }) {
  return (
    <dl className="kv-list">
      {rows.map((row) => (
        <div key={row.label} className="kv-row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDimensionLabel(key) {
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreDimensionBlock({ label, score, reason }) {
  const numScore = Number(score) || 0;
  const tone = numScore >= 85 ? 'good' : numScore >= 70 ? 'warn' : 'bad';
  return (
    <div className="score-dim">
      <div className="score-dim__header">
        <span className="score-dim__label">{label}</span>
        <span className={`score-dim__num score-dim__num--${tone}`}>{numScore}</span>
      </div>
      <div className="score-dim__bar">
        <div
          className={`score-dim__fill score-dim__fill--${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, numScore))}%` }}
        />
      </div>
      {reason && <p className="score-dim__reason">{reason}</p>}
    </div>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

function safeFilenamePart(value) {
  return String(value || 'unavailable').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/(^-|-$)/g, '') || 'unavailable';
}

function downloadTextFile(filename, content, type) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getAppUrl() {
  if (typeof window === 'undefined') return 'static-build';
  return window.location.origin + window.location.pathname;
}

function buildReviewContext(index, datasets, reviewMode) {
  const latestReview = datasets.latest_review || {};
  const latestPackage = datasets.latest_package || {};
  const latestBatch = datasets.latest_batch || {};
  const recommendation = datasets.promotion_recommendation || {};
  return {
    review_id: latestReview.review_id || recommendation.review_id || latestBatch.review_id || null,
    review_mode: reviewMode?.review_mode || null,
    review_scope: reviewMode?.review_scope || null,
    cohort_size: reviewMode?.cohort_size || null,
    recommended_run_id: reviewMode?.recommended_run_id || recommendation.recommended_run_id || null,
    included_run_ids: reviewMode?.included_run_ids || latestBatch.included_run_ids || [],
    package_id: latestPackage.package_id || null,
    package_run_id: latestPackage.run_id || null,
    batch_id: latestBatch.batch_id || null,
    freshness: index.freshness || null,
  };
}

function initialChecklistState() {
  return Object.fromEntries(REVIEW_CHECKLIST.map(([id]) => [id, false]));
}

function buildInitialReviewerDraft(context) {
  return {
    reviewer_alias: '',
    decision: 'accept_recommended',
    selected_run_id: context.recommended_run_id || '',
    confidence: 'medium',
    checklist: initialChecklistState(),
    issues: [],
    notes: '',
    downloaded_artifacts_acknowledged: false,
    needs_operator_explanation: false,
  };
}

function getReviewerCompletionState(draft) {
  const missing = [];
  if (!String(draft.reviewer_alias || '').trim()) missing.push('reviewer_alias');
  if (!draft.decision) missing.push('decision');
  if (!draft.selected_run_id) missing.push('selected_run_id');
  if (!draft.confidence) missing.push('confidence');
  for (const [id] of REVIEW_CHECKLIST) {
    if (!draft.checklist?.[id]) missing.push(`checklist.${id}`);
  }
  if (!String(draft.notes || '').trim()) missing.push('notes');
  if (!draft.downloaded_artifacts_acknowledged) missing.push('downloaded_artifacts_acknowledged');

  return {
    status: missing.length ? 'incomplete' : 'complete',
    missingFields: missing,
  };
}

function buildReviewerReceipt(context, draft) {
  const completion = getReviewerCompletionState(draft);
  return {
    schema_version: 'reviewer_session_v1',
    generated_at: new Date().toISOString(),
    app_url: getAppUrl(),
    review_context: context,
    completion_status: completion.status,
    missing_required_fields: completion.missingFields,
    downloaded_artifacts_acknowledged: Boolean(draft.downloaded_artifacts_acknowledged),
    needs_operator_explanation: Boolean(draft.needs_operator_explanation),
    reviewer: {
      alias: draft.reviewer_alias || 'anonymous_reviewer',
    },
    decision: draft.decision,
    selected_run_id: draft.selected_run_id || context.recommended_run_id || null,
    confidence: draft.confidence,
    checklist: draft.checklist,
    issues: draft.issues.filter((issue) => issue.category || issue.summary || issue.detail),
    notes: draft.notes || '',
  };
}

function buildReviewerMarkdown(receipt) {
  const ctx = receipt.review_context || {};
  const issues = receipt.issues || [];
  const checklistRows = Object.entries(receipt.checklist || {})
    .map(([key, value]) => `- ${value ? '[x]' : '[ ]'} ${key.replace(/_/g, ' ')}`)
    .join('\n');
  const issueRows = issues.length
    ? issues.map((issue, index) => `- ${index + 1}. \`${issue.category || 'uncategorized'}\` ${issue.summary || 'No summary'}${issue.detail ? ` — ${issue.detail}` : ''}`).join('\n')
    : '- No issues logged.';
  return `# Algo-Rhythm Reviewer Session Receipt

- Schema: \`${receipt.schema_version}\`
- Generated at: \`${receipt.generated_at}\`
- App URL: ${receipt.app_url}
- Reviewer: ${receipt.reviewer?.alias || 'anonymous_reviewer'}
- Completion status: \`${receipt.completion_status || 'Unavailable'}\`
- Missing required fields: ${(receipt.missing_required_fields || []).map((field) => `\`${field}\``).join(', ') || 'None'}
- Downloaded artifacts acknowledged: \`${receipt.downloaded_artifacts_acknowledged ? 'yes' : 'no'}\`
- Needs operator explanation: \`${receipt.needs_operator_explanation ? 'yes' : 'no'}\`

## Review Context

- Review ID: \`${ctx.review_id || 'Unavailable'}\`
- Review mode: \`${ctx.review_mode || 'Unavailable'}\`
- Review scope: \`${ctx.review_scope || 'Unavailable'}\`
- Cohort size: \`${ctx.cohort_size ?? 'Unavailable'}\`
- Recommended run: \`${ctx.recommended_run_id || 'Unavailable'}\`
- Included runs: ${(ctx.included_run_ids || []).map((runId) => `\`${runId}\``).join(', ') || 'Unavailable'}
- Package ID: \`${ctx.package_id || 'Unavailable'}\`
- Batch ID: \`${ctx.batch_id || 'Unavailable'}\`

## Reviewer Decision

- Decision: \`${receipt.decision}\`
- Selected run: \`${receipt.selected_run_id || 'Unavailable'}\`
- Confidence: \`${receipt.confidence}\`

## Checklist

${checklistRows}

## Issues

${issueRows}

## Notes

${receipt.notes || 'No notes.'}
`;
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  if (!value || value === 'Unavailable') return null;
  const canCopy = typeof navigator !== 'undefined' && typeof navigator?.clipboard?.writeText === 'function';
  if (!canCopy) return null;
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }
  return (
    <button
      type="button"
      className={`copy-btn${copied ? ' copy-btn--copied' : ''}`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : label}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function ShaField({ hash, note }) {
  if (!hash || hash === 'Unavailable') return <span className="muted">Unavailable</span>;
  return (
    <span className="sha-field">
      <code className="sha-field__hash">{hash}</code>
      <CopyButton value={hash} />
      {note ? <p className="muted sha-field__note">{note}</p> : null}
    </span>
  );
}

function getRecommendedRun(scorecard, recommendedRunId) {
  const rankedRuns = scorecard?.ranked_runs || [];
  return rankedRuns.find((run) => run.run_id === recommendedRunId) || rankedRuns[0] || null;
}

function getTopScoreSignals(run) {
  return Object.entries(run?.dimension_scores || {})
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .map(([key, value]) => ({ key, label: formatDimensionLabel(key), value }));
}

function DecisionBrief({ recommendation, scorecard, reviewMode }) {
  const recommendedRun = getRecommendedRun(scorecard, reviewMode?.recommended_run_id || recommendation?.recommended_run_id);
  const topSignals = getTopScoreSignals(recommendedRun);
  const includedRunIds = reviewMode?.included_run_ids || recommendation?.promotable_run_ids || [];

  return (
    <section className="decision-brief" aria-label="Decision brief">
      <div className="decision-brief__header">
        <div>
          <p className="panel-kicker">Decision brief</p>
          <h3>Review this recommendation, then export your receipt.</h3>
        </div>
        <StatusBadge tone="warn">manual-only</StatusBadge>
      </div>
      <div className="decision-brief__grid">
        <article className="decision-brief__card decision-brief__card--primary">
          <span>Recommended run</span>
          <code>{reviewMode?.recommended_run_id || recommendation?.recommended_run_id || 'Unavailable'}</code>
          <p>Accepting this run only records your local reviewer decision. It does not promote, submit, or deploy anything.</p>
        </article>
        <article className="decision-brief__card">
          <span>Reviewed cohort</span>
          <p>
            This is a reviewed cohort of {reviewMode?.cohort_size || includedRunIds.length || 0} runs,
            not a single refreshed snapshot.
          </p>
          <div className="run-chip-list">
            {includedRunIds.map((runId) => (
              <code key={runId}>{runId}</code>
            ))}
          </div>
        </article>
        <article className="decision-brief__card">
          <span>Top score signals</span>
          {topSignals.length ? (
            <ul className="signal-list">
              {topSignals.map((signal) => (
                <li key={signal.key}>
                  <strong>{signal.label}</strong>
                  <StatusBadge tone={Number(signal.value) >= 15 ? 'good' : 'warn'}>{signal.value}</StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p>Score signals are unavailable for this snapshot.</p>
          )}
        </article>
      </div>
      {(recommendation?.rationale || []).length ? (
        <ul className="decision-brief__rationale">
          {recommendation.rationale.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ReviewMatchStatus({ title, matches, rows }) {
  return (
    <section className="panel review-match-panel">
      <div className="review-match-panel__header">
        <h2>{title}</h2>
        <StatusBadge tone={matches ? 'good' : 'bad'}>{matches ? 'matches this review' : 'review mismatch'}</StatusBadge>
      </div>
      <KeyValueTable rows={rows} />
    </section>
  );
}

function groupedHandoffDownloads(downloads) {
  return [
    {
      id: 'reviewer_context',
      title: 'Reviewer receipt context',
      detail: 'Use these files to confirm canonical pointer and SHA context before sending reviewer receipts.',
      items: downloads.filter((item) => ['canonical_pointer', 'canonical_sha'].includes(item.id)),
    },
    {
      id: 'package_zip',
      title: 'Package ZIP',
      detail: 'The selected recommended run package for this review.',
      items: downloads.filter((item) => item.id === 'latest_package_zip'),
    },
    {
      id: 'batch_zip',
      title: 'Batch ZIP',
      detail: 'The reviewed cohort batch that includes every run in the decision surface.',
      items: downloads.filter((item) => item.id === 'latest_batch_zip'),
    },
    {
      id: 'external_archives',
      title: 'External archives',
      detail: 'These are listed for traceability but are not bundled in this static dashboard.',
      items: downloads.filter((item) => !['canonical_pointer', 'canonical_sha', 'latest_package_zip', 'latest_batch_zip'].includes(item.id)),
    },
  ].filter((group) => group.items.length);
}

function ErrorPanel({ title, detail, items = [] }) {
  return (
    <section className="panel error-panel">
      <h2>{title}</h2>
      <p>{detail}</p>
      {items.length ? (
        <ul className="stack-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function JsonCode({ value }) {
  return <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>;
}

function AlgoRhythmLogo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* input ticks */}
      <line x1="1" y1="17" x2="5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="21" x2="5" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="25" x2="5" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* diamond notehead / decision node */}
      <polygon points="16,13 24,21 16,29 8,21" fill="currentColor" />
      {/* stem */}
      <line x1="16" y1="13" x2="16" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* eighth-note flag */}
      <path d="M 16,4 Q 26,7 22,15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* yes/no branches */}
      <line x1="8" y1="21" x2="2" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="21" x2="30" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BrandHeader({ dataMode, freshness }) {
  return (
    <div className="brand-header">
      <div className="brand-header__row">
        <AlgoRhythmLogo size={30} className="brand-header__logo" />
        <span className="brand-header__wordmark">Algo-Rhythm</span>
      </div>
      <p className="brand-header__context">Lane B · Internal review</p>
      <div className="mode-labels">
        <span className="mode-label">{freshness?.mode || dataMode || 'static_refresh'}</span>
        <span className="mode-label-sep">·</span>
        <span className="mode-label">{freshness?.status || 'fresh'}</span>
        <span className="mode-label-sep">·</span>
        <span className="mode-label">no backend</span>
      </div>
    </div>
  );
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? '☀' : '☽'}
    </button>
  );
}

function PipelineBar({ pages, activePage, onNavigate, onHome, datasets, onHamburger }) {
  return (
    <header className="pipeline-bar" role="navigation" aria-label="Pipeline stages">
      <button
        type="button"
        className="pipeline-brand"
        onClick={onHome}
        aria-label="Algo-Rhythm home"
      >
        <AlgoRhythmLogo size={22} className="pipeline-brand__icon" />
        <span className="pipeline-brand__wordmark">Algo-Rhythm</span>
      </button>
      <button
        type="button"
        className="pipeline-bar__hamburger"
        onClick={onHamburger}
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>
      <div className="pipeline-bar__stages">
        {pages.map((page, i) => {
          const display = PAGE_DISPLAY[page.id] || {};
          const isActive = page.id === activePage;
          const hasData = pageHasData(page.id, datasets || {});
          let cls = 'pipeline-bar__stage';
          if (isActive) cls += ' pipeline-bar__stage--active';
          else if (!hasData) cls += ' pipeline-bar__stage--dim';
          return (
            <span key={page.id} className="pipeline-bar__item">
              <button
                type="button"
                className={cls}
                onClick={() => onNavigate(page.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="pipeline-bar__num">{i + 1}</span>
                <span className="pipeline-bar__name pipeline-bar__name--full">{display.label || page.label}</span>
                <span className="pipeline-bar__name pipeline-bar__name--short">{display.shortLabel || display.label}</span>
              </button>
              {i < pages.length - 1 && (
                <span className="pipeline-bar__sep" aria-hidden="true">·</span>
              )}
            </span>
          );
        })}
      </div>
      <div className="pipeline-actions">
        <div className="auth-user-control" aria-label="Signed-in user controls">
          <UserButton afterSignOutUrl={`${basePath || ''}/sign-in`} />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

function useDashboardData() {
  const [state, setState] = useState({
    loading: true,
    fatalError: null,
    index: null,
    datasets: {},
    optionalErrors: {},
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const base = import.meta.env.BASE_URL.replace(/\/$/, '');
        const indexResponse = await fetch(`${base}/data/dashboard_index.json`, { cache: 'no-store' });
        if (!indexResponse.ok) {
          throw new Error(`dashboard_index fetch failed (${indexResponse.status})`);
        }

        const index = await indexResponse.json();
        if (!index || typeof index !== 'object' || !index.datasets) {
          throw new Error('dashboard_index is missing datasets');
        }

        const datasetEntries = Object.entries(index.datasets);
        const results = await Promise.all(
          datasetEntries.map(async ([id, meta]) => {
            try {
              const publicPath = meta.public_path.startsWith('/')
                ? `${base}${meta.public_path}`
                : meta.public_path;
              const response = await fetch(publicPath, { cache: 'no-store' });
              if (!response.ok) throw new Error(`fetch failed (${response.status})`);
              const data = await response.json();
              return [id, { ok: true, data }];
            } catch (error) {
              return [id, { ok: false, error: error.message }];
            }
          })
        );

        if (cancelled) return;

        const datasets = {};
        const optionalErrors = {};
        const requiredErrors = [];

        for (const [id, result] of results) {
          const meta = index.datasets[id];
          if (result.ok) {
            datasets[id] = result.data;
            continue;
          }
          if (meta.required) {
            requiredErrors.push(`${id}: ${result.error}`);
          } else {
            optionalErrors[id] = result.error;
          }
        }

        if (requiredErrors.length) {
          setState({ loading: false, fatalError: `Required datasets failed to load: ${requiredErrors.join('; ')}`, index, datasets, optionalErrors });
          return;
        }

        setState({ loading: false, fatalError: null, index, datasets, optionalErrors });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, fatalError: error.message, index: null, datasets: {}, optionalErrors: {} });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}

function OverviewPage({ index, datasets }) {
  const latestRun = datasets.latest_run;
  const latestReview = datasets.latest_review;
  const latestPackage = datasets.latest_package;
  const latestBatch = datasets.latest_batch;
  const summary = index.summary || {};
  const warnings = index.warnings || [];
  const uiContract = index.ui_contract || {};
  const freshness = index.freshness || {};
  const reviewMode = getReviewModeMeta(index, datasets);
  const singleRun = isSingleRunMode(reviewMode);

  return (
    <div className="page-grid">
      <section className="panel span-2 hero-panel">
        <p className="panel-kicker">Lane B delivery posture</p>
        <h2>Overview</h2>
        <p className="lede">
          {singleRun
            ? 'Beta-safe single-run refresh snapshot with one reviewed recommendation, one package, and one batch pointer.'
            : 'Roadmap-target multi-run Lane B review with ranked runs, recommendation, and review-bound package and batch pointers.'}
          {' '}All data reads from bundled JSON only.
        </p>
        <div className="stat-row">
          <div className="stat-item stat-item--promoted">
            <span className="stat-chip stat-chip--promoted">↑ promoted alias</span>
            <code className="stat-value">{summary.top_level_alias_run_id || '—'}</code>
            <span className="stat-detail">{(summary.top_level_alias_candidate_ids || []).join(', ') || 'No candidates'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item stat-item--latest">
            <span className="stat-chip stat-chip--latest">latest successful run</span>
            <code className="stat-value">{latestRun?.latest_successful_run_id || '—'}</code>
            <span className="stat-detail">{latestRun?.run_manifest_path || 'No path'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item stat-item--pick">
            <span className="stat-chip stat-chip--pick">⊙ {singleRun ? 'refresh snapshot' : 'review recommendation'}</span>
            <code className="stat-value">{latestReview?.recommended_run_id || '—'}</code>
            <span className="stat-detail">{latestReview?.review_id || 'No review ID'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item stat-item--pkg">
            <span className="stat-chip stat-chip--pkg">▣ {singleRun ? 'single-run package' : 'review-bound package'}</span>
            <code className="stat-value">{latestPackage?.run_id || '—'}</code>
            <span className="stat-detail">{latestPackage?.package_id || 'No package ID'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-chip">{singleRun ? 'single-run batch' : 'latest batch'}</span>
            <code className="stat-value">{latestBatch?.review_id || '—'}</code>
            <span className="stat-detail">{`${reviewMode?.cohort_size || latestBatch?.included_run_ids?.length || 0} included runs`}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Review mode</h2>
        <KeyValueTable
          rows={[
            { label: 'Mode', value: reviewModeLabel(reviewMode) },
            { label: 'Scope', value: reviewMode.review_scope || 'Unavailable' },
            { label: 'Cohort size', value: reviewMode.cohort_size || 'Unavailable' },
            { label: 'Recommended run', value: reviewMode.recommended_run_id || 'Unavailable' },
            { label: 'Included runs', value: (reviewMode.included_run_ids || []).join(', ') || 'Unavailable' },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Algo freshness</h2>
        <KeyValueTable
          rows={[
            { label: 'Mode', value: freshness.mode || 'Unavailable' },
            { label: 'Status', value: <StatusBadge tone={freshness.status === 'fresh' ? 'good' : freshness.status === 'staged' ? 'warn' : 'bad'}>{freshness.status || 'Unavailable'}</StatusBadge> },
            { label: 'Refreshed at', value: formatDate(freshness.refreshed_at) },
            { label: 'Snapshot ID', value: freshness.evidence_snapshot_id || 'Unavailable' },
            { label: 'Source policy', value: freshness.source_policy || 'Unavailable' },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Package integrity</h2>
        <KeyValueTable
          rows={[
            { label: 'Run ID', value: latestPackage?.run_id || 'Unavailable' },
            { label: 'Package ID', value: latestPackage?.package_id || 'Unavailable' },
            { label: 'Manifest SHA', value: <ShaField hash={latestPackage?.package_manifest_sha256} /> },
            { label: 'Package SHA', value: <ShaField hash={latestPackage?.package_zip_sha256} /> },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Batch snapshot</h2>
        <KeyValueTable
          rows={[
            { label: 'Batch ID', value: latestBatch?.batch_id || 'Unavailable' },
            { label: 'Review ID', value: latestBatch?.review_id || 'Unavailable' },
            { label: 'Included runs', value: (latestBatch?.included_run_ids || []).join(', ') || 'Unavailable' },
            { label: 'Batch ZIP SHA', value: <ShaField hash={latestBatch?.batch_zip_sha256} /> },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Required state distinctions</h2>
        {(uiContract.required_state_distinctions || []).length ? (
          <ul className="stack-list">
            {uiContract.required_state_distinctions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Unavailable" detail="No state distinctions were embedded into the contract." />
        )}
      </section>

      <section className="panel">
        <h2>{singleRun ? 'Operator notes' : 'Contract warnings'}</h2>
        {warnings.length ? (
          <ul className="warning-list">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No warnings" detail="The current static contract resolved without ambiguity." />
        )}
      </section>
    </div>
  );
}

function StrategyPage({ datasets }) {
  const content = datasets.content_object;
  const trends = datasets.trend_shortlist;
  const selection = datasets.platform_signal_selection;
  const scorecard = datasets.viability_scorecard;
  const adaptations = datasets.four_tier_adaptations;
  const experiment = datasets.experiment_plan;
  const ledger = datasets.campaign_ledger_seed;

  return (
    <div className="page-grid">
      <section className="panel span-2 hero-panel">
        <p className="panel-kicker">Source content</p>
        <h2>Strategy substrate</h2>
        {content ? (
          <>
            <p className="lede">{content.source_summary}</p>
            <KeyValueTable
              rows={[
                { label: 'Content ID', value: content.content_id },
                { label: 'Goal', value: content.operator_goal },
                { label: 'Audience', value: content.audience || 'Unavailable' },
                { label: 'Platforms', value: (content.target_platforms || []).join(', ') || 'Unavailable' },
              ]}
            />
          </>
        ) : (
          <EmptyState title="Content unavailable" detail="CONTENT_OBJECT.json did not load." />
        )}
      </section>

      <section className="panel">
        <h2>Trend shortlist</h2>
        {trends?.trends?.length ? (
          <ul className="stack-list">
            {trends.trends.map((trend) => (
              <li key={trend.trend_id || trend.title}>
                <strong>{trend.title || trend.trend_id}</strong>
                <p>{trend.assumption_label || trend.note || 'Unavailable'}</p>
                <p className="muted">
                  Basis: {trend.basis || 'Unavailable'} · Confidence: {trend.confidence || 'Unavailable'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Unavailable" detail="Trend shortlist data is missing." />
        )}
      </section>

      <section className="panel">
        <h2>Viability scorecard</h2>
        {scorecard ? (
          <>
            <div className="metrics compact">
              <MetricCard label="Total score" value={scorecard.total_score} tone="good" />
              <MetricCard label="Recommendation" value={scorecard.recommendation} />
              <MetricCard label="Confidence" value={scorecard.confidence} tone="warn" />
            </div>
            <div className="score-dim-list">
              {Object.entries(scorecard.dimensions || {}).map(([key, detail]) => (
                <ScoreDimensionBlock
                  key={key}
                  label={formatDimensionLabel(key)}
                  score={detail.score}
                  reason={detail.reason}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="Unavailable" detail="Viability scorecard data is missing." />
        )}
      </section>

      <section className="panel span-2">
        <h2>Platform properties</h2>
        {selection?.platforms ? (
          <div className="split-grid">
            {Object.entries(selection.platforms).map(([platform, detail]) => (
              <article className="surface-card" key={platform}>
                <div className="surface-heading">
                  <h3>{platform}</h3>
                  <div className="badge-row">
                    <span className="property-chip">Property</span>
                    <StatusBadge tone="good">selected</StatusBadge>
                  </div>
                </div>
                <p>{detail.selection_reason}</p>
                <p className="muted">Cards: {(detail.selected_card_ids || []).join(', ') || 'Unavailable'}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Unavailable" detail="Platform selection data is missing." />
        )}
      </section>

      <section className="panel">
        <h2>Execution playbook</h2>
        {adaptations ? (() => {
          const tiers = Array.isArray(adaptations.tiers)
            ? adaptations.tiers
            : Array.isArray(adaptations)
            ? adaptations
            : Object.entries(adaptations).map(([k, v]) =>
                typeof v === 'object' && v !== null
                  ? { tier_id: k, tier_label: k, ...v }
                  : { tier_id: k, tier_label: k, description: String(v) }
              );
          if (!tiers.length) return <EmptyState title="Unavailable" detail="No tiers found in adaptation data." />;
          return (
            <div className="split-grid">
              {tiers.map((tier, i) => (
                <article className="surface-card" key={tier.tier_id || tier.id || tier.tier_label || i}>
                  <div className="surface-heading">
                    <h3>{tier.tier_label || tier.label || tier.tier_id || 'Tier'}</h3>
                    {tier.tier_id && <StatusBadge tone="neutral">{tier.tier_id}</StatusBadge>}
                  </div>
                  {tier.description && <p>{tier.description}</p>}
                  {Array.isArray(tier.per_platform) && tier.per_platform.length ? (
                    <ul className="tight-list">
                      {tier.per_platform.map((pp) => (
                        <li key={pp.platform}>
                          <strong>{pp.platform}</strong>
                          {pp.format_shift && <p className="muted">{pp.format_shift}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          );
        })() : (
          <EmptyState title="Unavailable" detail="Adaptation data is missing." />
        )}
      </section>

      <section className="panel">
        <h2>Test hypotheses</h2>
        {experiment ? (() => {
          const hyps = Array.isArray(experiment.hypotheses)
            ? experiment.hypotheses
            : Array.isArray(experiment.variants)
            ? experiment.variants
            : Array.isArray(experiment)
            ? experiment
            : Object.entries(experiment).map(([k, v]) =>
                typeof v === 'object' && v !== null
                  ? { platform: k, hypothesis: v.hypothesis || v.description || '', ...v }
                  : { platform: k, hypothesis: String(v) }
              );
          if (!hyps.length) return <EmptyState title="Unavailable" detail="No hypotheses found in experiment plan." />;
          return (
            <div className="split-grid">
              {hyps.map((h, i) => (
                <article className="surface-card" key={h.platform || h.id || i}>
                  <div className="surface-heading">
                    <h3>{h.platform || h.name || h.id || `Hypothesis ${i + 1}`}</h3>
                    <StatusBadge tone="warn">hypothesis</StatusBadge>
                  </div>
                  {h.hypothesis && <p>{h.hypothesis}</p>}
                  {Array.isArray(h.success_checks) && h.success_checks.length ? (
                    <ul className="tight-list">
                      {h.success_checks.map((check) => (
                        <li key={check} className="muted">{check}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          );
        })() : (
          <EmptyState title="Unavailable" detail="Experiment plan data is missing." />
        )}
      </section>

      <section className="panel">
        <h2>Campaign ledger seed</h2>
        {ledger?.entries?.length ? (
          <>
            {ledger.entries.map((entry) => (
              <div key={entry.entry_id} className="ledger-entry">
                <div className="ledger-entry__head">
                  <code className="ledger-entry__id">{entry.entry_id}</code>
                  <StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge>
                </div>
                <KeyValueTable
                  rows={[
                    { label: 'Content ref', value: entry.content_object_ref || 'Unavailable' },
                    { label: 'Viability', value: entry.viability_recommendation || 'Unavailable' },
                    { label: 'Assumptions', value: entry.assumption_count ?? 'Unavailable' },
                    { label: 'Platforms', value: (entry.target_platforms || []).join(', ') || 'Unavailable' },
                    { label: 'Trend refs', value: (entry.trend_refs || []).length + ' trends' },
                    { label: 'Selected cards', value: (entry.selected_card_ids || []).length + ' cards' },
                  ]}
                />
                {entry.next_operator_action && (
                  <p className="ledger-entry__action">
                    <strong>Next action:</strong> {entry.next_operator_action}
                  </p>
                )}
              </div>
            ))}
          </>
        ) : (
          <EmptyState title="Unavailable" detail="Campaign ledger seed data is missing." />
        )}
      </section>
    </div>
  );
}

function useWorkspaceDraft(index, datasets) {
  const sourceId = getWorkspaceSourceId(datasets);
  const storageKey = `algo-rhythm:strategy-workspace:v1:${sourceId}`;
  const onboardingKey = `algo-rhythm:strategy-workspace:onboarding:v1:${sourceId}`;
  const [draft, setDraft] = useState(() => {
    const initial = buildInitialWorkspaceDraft(index, datasets);
    if (typeof window === 'undefined') return initial;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? mergeWorkspaceDraft(initial, JSON.parse(saved)) : initial;
    } catch {
      return initial;
    }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(onboardingKey) !== 'hidden';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {}
  }, [draft, storageKey]);

  function updateProject(field, value) {
    setDraft((current) => ({
      ...current,
      project: { ...current.project, [field]: value },
      updated_at: new Date().toISOString(),
    }));
  }

  function updateIntake(field, value) {
    setDraft((current) => ({
      ...current,
      intake: { ...current.intake, [field]: value },
      updated_at: new Date().toISOString(),
    }));
  }

  function updatePlatformDraft(platform, field, value) {
    setDraft((current) => ({
      ...current,
      platform_drafts: current.platform_drafts.map((item) => (
        item.platform === platform ? { ...item, [field]: value } : item
      )),
      updated_at: new Date().toISOString(),
    }));
  }

  function updateCalendarItem(id, field, value) {
    setDraft((current) => ({
      ...current,
      calendar_items: current.calendar_items.map((item) => (
        item.id === id ? { ...item, [field]: value } : item
      )),
      updated_at: new Date().toISOString(),
    }));
  }

  function updateResultLog(id, field, value) {
    setDraft((current) => ({
      ...current,
      result_logs: current.result_logs.map((item) => (
        item.id === id ? { ...item, [field]: value } : item
      )),
      updated_at: new Date().toISOString(),
    }));
  }

  function updateExportAcknowledgement(value) {
    setDraft((current) => ({
      ...current,
      export_status: { ...current.export_status, acknowledged: value },
      updated_at: new Date().toISOString(),
    }));
  }

  function selectDraftTier(tierId) {
    const tier = getTierById(datasets, tierId);
    const content = datasets.content_object || {};
    setDraft((current) => ({
      ...current,
      selected_draft_tier: tier?.tier_id || tierId,
      platform_drafts: buildPlatformDrafts(content, tier).map((nextDraft) => {
        const existing = current.platform_drafts.find((item) => item.platform === nextDraft.platform);
        return existing
          ? { ...nextDraft, notes: existing.notes || '', draft_copy: existing.draft_copy || nextDraft.draft_copy }
          : nextDraft;
      }),
      updated_at: new Date().toISOString(),
    }));
  }

  function resetWorkspace() {
    const initial = buildInitialWorkspaceDraft(index, datasets);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(storageKey); } catch {}
    }
    setDraft(initial);
  }

  function recordExport() {
    setDraft((current) => ({
      ...current,
      export_status: { ...current.export_status, last_exported_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }));
  }

  function downloadWorkspaceJson() {
    if (!draft.export_status?.acknowledged) return;
    const receipt = buildStrategyWorkspaceReceipt(draft);
    const filename = `ALGO_STRATEGY_WORKSPACE__${safeFilenamePart(draft.source_content_id)}.json`;
    downloadTextFile(filename, `${JSON.stringify(receipt, null, 2)}\n`, 'application/json');
    recordExport();
  }

  function downloadWorkspaceMarkdown() {
    if (!draft.export_status?.acknowledged) return;
    const receipt = buildStrategyWorkspaceReceipt(draft);
    const filename = `ALGO_STRATEGY_WORKSPACE__${safeFilenamePart(draft.source_content_id)}.md`;
    downloadTextFile(filename, buildStrategyWorkspaceMarkdown(receipt, datasets), 'text/markdown');
    recordExport();
  }

  function setOnboardingVisible(value) {
    setShowOnboarding(value);
    if (typeof window === 'undefined') return;
    try {
      if (value) localStorage.removeItem(onboardingKey);
      else localStorage.setItem(onboardingKey, 'hidden');
    } catch {}
  }

  return {
    draft,
    storageKey,
    onboardingKey,
    showOnboarding,
    updateProject,
    updateIntake,
    updatePlatformDraft,
    updateCalendarItem,
    updateResultLog,
    updateExportAcknowledgement,
    selectDraftTier,
    resetWorkspace,
    downloadWorkspaceJson,
    downloadWorkspaceMarkdown,
    setOnboardingVisible,
  };
}

function WorkspaceOnboardingPanel({ workspace, onNavigate }) {
  if (!workspace.showOnboarding) {
    return (
      <div className="guide-toggle">
        <button type="button" className="btn btn-outline" onClick={() => workspace.setOnboardingVisible(true)}>
          Show guide
        </button>
      </div>
    );
  }

  return (
    <section className="panel span-2 onboarding-panel" aria-label="Getting started guide">
      <div>
        <p className="panel-kicker">Start here</p>
        <h2>Make a posting plan in 5 steps.</h2>
        <ol className="onboarding-list">
          <li>Check your idea.</li>
          <li>Edit your drafts.</li>
          <li>Pick when to post.</li>
          <li>Track results.</li>
          <li>Download your plan.</li>
        </ol>
        <div className="safety-note" role="note">
          <p>Nothing posts automatically.</p>
          <p>Your edits stay in this browser until you download them.</p>
        </div>
      </div>
      <div className="onboarding-actions">
        <button type="button" className="btn btn-primary btn-large" onClick={() => onNavigate('intake')}>
          Start: Check Idea
        </button>
        <button type="button" className="btn btn-outline" onClick={() => workspace.setOnboardingVisible(false)}>
          Hide this guide
        </button>
      </div>
    </section>
  );
}

function WorkflowProgressPanel({ workspace, onNavigate }) {
  const progress = getWorkspaceProgress(workspace.draft);
  return (
    <section className="panel workflow-progress-panel" aria-label="Your progress">
      <h2>Your Progress</h2>
      <div className="workflow-progress-list">
        {WORKFLOW_STEPS.map((step) => {
          const state = progress[step.id];
          return (
            <div className="workflow-progress-row" key={step.id}>
              <div>
                <span className="workflow-progress-row__step">Step {step.number}</span>
                <strong>{step.label}</strong>
              </div>
              <StatusBadge tone={progressTone(state.status)}>{state.status}</StatusBadge>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate(step.pageId)}>
                {step.actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PageTaskGuide({ pageId }) {
  const step = getWorkflowStepForPage(pageId);
  if (!step) return null;
  const items = [
    ['What this page is for', step.purpose],
    ['What to do here', step.todo],
    ['What happens next', step.next],
    ['What will not happen', step.willNot],
  ];
  return (
    <section className="panel span-2 page-task-guide" aria-label={`${step.label} guide`}>
      <p className="panel-kicker">Step {step.number} of 5</p>
      <h2>{step.label}</h2>
      <div className="purpose-grid">
        {items.map(([label, detail]) => (
          <div className="purpose-item" key={label}>
            <h3>{label}</h3>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StepActionBar({ activePage, onNavigate }) {
  const nextStep = getNextStep(activePage);
  const previousStep = getPreviousStep(activePage);
  if (!isStepPage(activePage)) return null;

  const primaryLabel = activePage === 'workspace'
    ? 'Start: Check Idea'
    : activePage === 'results'
      ? 'Next: Download Plan'
      : `Next: ${nextStep.label}`;
  const primaryTarget = activePage === 'workspace' ? 'intake' : nextStep.pageId;
  const secondaryLabel = previousStep ? `Back: ${previousStep.label}` : 'Back to Home';
  const secondaryTarget = previousStep ? previousStep.pageId : 'workspace';

  return (
    <div className="step-action-bar" aria-label="Step actions">
      {activePage !== 'workspace' && (
        <button type="button" className="btn btn-outline" onClick={() => onNavigate(secondaryTarget)}>
          {secondaryLabel}
        </button>
      )}
      <button type="button" className="btn btn-primary btn-large" onClick={() => onNavigate(primaryTarget)}>
        {primaryLabel}
      </button>
    </div>
  );
}

function WorkspaceExportPanel({ workspace }) {
  const canExport = Boolean(workspace.draft.export_status?.acknowledged);
  const progress = getWorkspaceProgress(workspace.draft);
  const checklist = [
    ['Idea checked', progress.intake.done],
    ['At least one draft reviewed', progress.drafts.done],
    ['Schedule added', progress.calendar.done],
    ['Results notes added', progress.results.done],
    ['I understand this is a local file', canExport],
  ];
  const missingCount = checklist.filter(([, done]) => !done).length;
  return (
    <section className="workspace-export-panel" id="download-plan" aria-label="Download plan">
      <div>
        <p className="panel-kicker">Download plan · Step 5</p>
        <h3>Download your plan.</h3>
        <div className="purpose-grid purpose-grid--compact">
          <div className="purpose-item">
            <h3>What this page is for</h3>
            <p>Use this section to download files you can keep or send.</p>
          </div>
          <div className="purpose-item">
            <h3>What to do here</h3>
            <p>Check the box, then download JSON or Markdown.</p>
          </div>
          <div className="purpose-item">
            <h3>What happens next</h3>
            <p>Use the files by hand after download.</p>
          </div>
          <div className="purpose-item">
            <h3>What will not happen</h3>
            <p>Downloading does not send the plan to anyone.</p>
          </div>
        </div>
        <ul className="export-checklist">
          {checklist.map(([label, done]) => (
            <li key={label} className={done ? 'export-checklist__item export-checklist__item--done' : 'export-checklist__item'}>
              <span aria-hidden="true">{done ? '✓' : '□'}</span>
              {label}
            </li>
          ))}
        </ul>
        {missingCount > 0 && (
          <p className="muted">You can still download, but these items are not done yet.</p>
        )}
        <p className="muted">Downloads are files only. Nothing is posted, submitted, or saved to a server.</p>
        <label className="check-row workspace-export-panel__ack">
          <input
            type="checkbox"
            checked={canExport}
            onChange={(event) => workspace.updateExportAcknowledgement(event.target.checked)}
          />
          <span>I understand this is a local file. I will use it or send it by hand.</span>
        </label>
      </div>
      <div className="reviewer-workspace__actions">
        <button type="button" className="btn btn-primary btn-large" onClick={workspace.downloadWorkspaceJson} disabled={!canExport}>
          Download JSON Plan
        </button>
        <button type="button" className="btn btn-outline" onClick={workspace.downloadWorkspaceMarkdown} disabled={!canExport}>
          Download Markdown Plan
        </button>
      </div>
    </section>
  );
}

function WorkspaceTaskCallout({ activePage, onNavigate }) {
  return (
    <section className="reviewer-task-callout workspace-task-callout" aria-label="Workspace task">
      <div>
        <p className="panel-kicker">Posting plan</p>
        <h3>Turn one idea into posts you can use.</h3>
        <p>
          Follow the steps in order. This app does not post, connect social accounts, send notes,
          or save your work to a server.
        </p>
      </div>
      {activePage !== 'workspace' ? (
        <button type="button" className="btn btn-primary" onClick={() => onNavigate('workspace')}>
          Go to Home
        </button>
      ) : (
        <StatusBadge tone="good">Home active</StatusBadge>
      )}
    </section>
  );
}

function WorkspacePage({ datasets, workspace, onNavigate }) {
  const draft = workspace.draft;
  const platforms = asArray(draft.intake?.target_platforms);
  const filledSchedule = asArray(draft.calendar_items).filter((item) => item.date || item.time || item.notes).length;
  const resultCount = asArray(draft.result_logs).filter((item) => (
    item.impressions || item.saves || item.clicks || item.replies_comments || item.reposts_shares || item.conversions || item.qualitative_notes
  )).length;
  const content = datasets.content_object || {};

  return (
    <div className="page-grid">
      <WorkspaceOnboardingPanel workspace={workspace} onNavigate={onNavigate} />

      <section className="panel span-2 hero-panel workspace-hero">
        <p className="panel-kicker">Home</p>
        <h2>Build a social posting plan.</h2>
        <p className="lede">
          Start with one idea. Edit the drafts. Pick a schedule. Track results. Download the plan.
          The starter plan is “{draft.project?.name || content.title || 'Untitled strategy'}”.
        </p>
        <div className="stat-row">
          <div className="stat-item stat-item--promoted">
            <span className="stat-chip stat-chip--promoted">project</span>
            <code className="stat-value">{draft.project?.status || 'planning'}</code>
            <span className="stat-detail">{draft.project?.name || 'Untitled strategy'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-chip">platforms</span>
            <code className="stat-value">{platforms.length}</code>
            <span className="stat-detail">{platforms.join(', ') || 'No platforms selected'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item stat-item--pick">
            <span className="stat-chip stat-chip--pick">draft style</span>
            <code className="stat-value">{draftStyleLabel(draft.selected_draft_tier)}</code>
            <span className="stat-detail">Editable platform drafts</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-chip">download</span>
            <code className="stat-value">{draft.export_status?.acknowledged ? 'ready' : 'not ready'}</code>
            <span className="stat-detail">{draft.export_status?.last_exported_at ? `last ${formatDateShort(draft.export_status.last_exported_at)}` : 'No download yet'}</span>
          </div>
        </div>
      </section>

      <WorkflowProgressPanel workspace={workspace} onNavigate={onNavigate} />

      <section className="panel">
        <h2>Next actions</h2>
        <div className="workspace-action-list">
          {[
            ['intake', 'Check the idea, audience, offer, and goal.'],
            ['drafts', 'Edit the words for each platform.'],
            ['calendar', 'Pick when and where to post by hand.'],
            ['results', 'Write down what happened after posting.'],
          ].map(([pageId, detail]) => (
            <button key={pageId} type="button" className="workspace-action" onClick={() => onNavigate(pageId)}>
              <span>{PAGE_DISPLAY[pageId].label}</span>
              <small>{detail}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Campaign summary</h2>
        <KeyValueTable
          rows={[
            { label: 'Audience', value: draft.intake?.audience || 'Unavailable' },
            { label: 'Goal', value: draft.intake?.goal || 'Unavailable' },
            { label: 'Call to action', value: draft.intake?.primary_cta || 'Unavailable' },
            { label: 'Schedule items', value: `${filledSchedule}/${draft.calendar_items.length}` },
            { label: 'Result notes', value: `${resultCount}/${draft.result_logs.length}` },
          ]}
        />
      </section>

      <section className="panel span-2">
        <h2>Platform plan</h2>
        <div className="split-grid">
          {asArray(draft.platform_drafts).map((item) => (
            <article className="surface-card" key={item.platform}>
              <div className="surface-heading">
                <h3>{item.platform}</h3>
                <StatusBadge tone="good">starter draft</StatusBadge>
              </div>
              <p>{item.format_shift || 'Starter text for this platform.'}</p>
              <p className="muted">{item.cta || draft.intake?.primary_cta || 'No call to action yet.'}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkspaceExportPanel workspace={workspace} />
      <StepActionBar activePage="workspace" onNavigate={onNavigate} />
    </div>
  );
}

function IntakePage({ datasets, workspace, onNavigate }) {
  const draft = workspace.draft;
  const availablePlatforms = asArray(datasets.content_object?.target_platforms);

  function togglePlatform(platform, checked) {
    const current = new Set(asArray(draft.intake.target_platforms));
    if (checked) current.add(platform);
    else current.delete(platform);
    workspace.updateIntake('target_platforms', Array.from(current));
  }

  return (
    <div className="page-grid">
      <PageTaskGuide pageId="intake" />

      <section className="panel span-2">
        <p className="panel-kicker">Step 1</p>
        <h2>Check the idea.</h2>
        <p className="lede">These fields only change this browser and your downloaded files.</p>
      </section>

      <section className="panel span-2">
        <div className="form-row">
          <label className="field">
            <span>Project name</span>
            <input type="text" value={draft.project.name} onChange={(event) => workspace.updateProject('name', event.target.value)} />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={draft.project.status} onChange={(event) => workspace.updateProject('status', event.target.value)}>
              <option value="planning">planning</option>
              <option value="ready_to_post">ready to post</option>
              <option value="testing">testing</option>
              <option value="complete">complete</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Source idea</span>
          <textarea rows={6} value={draft.intake.source_idea} onChange={(event) => workspace.updateIntake('source_idea', event.target.value)} />
        </label>

        <div className="form-row">
          <label className="field">
            <span>Audience</span>
            <input type="text" value={draft.intake.audience} onChange={(event) => workspace.updateIntake('audience', event.target.value)} />
          </label>
          <label className="field">
            <span>Offer</span>
            <input type="text" value={draft.intake.offer} onChange={(event) => workspace.updateIntake('offer', event.target.value)} placeholder="Product, service, lead magnet, or no offer yet" />
          </label>
        </div>

        <label className="field">
          <span>Goal</span>
          <textarea rows={3} value={draft.intake.goal} onChange={(event) => workspace.updateIntake('goal', event.target.value)} />
        </label>

        <div className="form-row">
          <label className="field">
            <span>Call to action</span>
            <input type="text" value={draft.intake.primary_cta} onChange={(event) => workspace.updateIntake('primary_cta', event.target.value)} />
          </label>
          <label className="field">
            <span>Tone notes</span>
            <input type="text" value={draft.intake.tone_notes} onChange={(event) => workspace.updateIntake('tone_notes', event.target.value)} />
          </label>
        </div>

        <div className="field">
          <span>Target platforms</span>
          <div className="checklist-grid">
            {availablePlatforms.map((platform) => (
              <label className="check-row" key={platform}>
                <input
                  type="checkbox"
                  checked={asArray(draft.intake.target_platforms).includes(platform)}
                  onChange={(event) => togglePlatform(platform, event.target.checked)}
                />
                <span>{platform}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Constraints</span>
          <textarea rows={5} value={draft.intake.constraints} onChange={(event) => workspace.updateIntake('constraints', event.target.value)} />
          <small>Keep this manual. Do not add posting automation or claims you cannot support.</small>
        </label>
      </section>
      <StepActionBar activePage="intake" onNavigate={onNavigate} />
    </div>
  );
}

function DraftsPage({ datasets, workspace, onNavigate }) {
  const draft = workspace.draft;
  const tiers = getAdaptationTiers(datasets);

  return (
    <div className="page-grid">
      <PageTaskGuide pageId="drafts" />

      <section className="panel span-2">
        <p className="panel-kicker">Step 2</p>
        <h2>Edit the drafts.</h2>
        <p className="lede">Use the draft as a start. Change the words before you use them.</p>
        <label className="field workspace-tier-select">
          <span>Draft style</span>
          <select value={draft.selected_draft_tier} onChange={(event) => workspace.selectDraftTier(event.target.value)}>
            {tiers.map((tier) => (
              <option key={tier.tier_id} value={tier.tier_id}>{draftStyleLabel(tier.tier_label || tier.tier_id)}</option>
            ))}
          </select>
        </label>
      </section>

      {asArray(draft.platform_drafts).map((item) => (
        <section className="panel workspace-draft-card" key={item.platform}>
          <div className="surface-heading">
            <h2>{item.platform}</h2>
            <CopyButton value={item.draft_copy || ''} label="Copy Draft" />
          </div>
          <p className="muted">{item.format_shift || 'Starter text for this platform.'}</p>
          <label className="field">
            <span>Draft copy</span>
            <textarea rows={8} value={item.draft_copy} onChange={(event) => workspace.updatePlatformDraft(item.platform, 'draft_copy', event.target.value)} />
          </label>
          <label className="field">
            <span>Draft notes</span>
            <textarea rows={3} value={item.notes} onChange={(event) => workspace.updatePlatformDraft(item.platform, 'notes', event.target.value)} placeholder="Creative direction, asset needs, caption notes, or revision ideas" />
          </label>
          <KeyValueTable
            rows={[
              { label: 'Opening idea', value: item.hook_direction || 'Unavailable' },
              { label: 'Call to action', value: item.cta || 'Unavailable' },
              { label: 'Why this draft may work', value: asArray(item.supporting_card_ids).map(supportSignalLabel).join(', ') || 'Unavailable' },
            ]}
          />
        </section>
      ))}
      <StepActionBar activePage="drafts" onNavigate={onNavigate} />
    </div>
  );
}

function CalendarPage({ workspace, onNavigate }) {
  const draft = workspace.draft;
  return (
    <div className="page-grid">
      <PageTaskGuide pageId="calendar" />

      <section className="panel span-2">
        <p className="panel-kicker">Step 3</p>
        <h2>Pick a schedule.</h2>
        <p className="lede">This does not connect to social platforms. It does not publish anything.</p>
      </section>

      {asArray(draft.calendar_items).map((item) => (
        <section className="panel workspace-schedule-card" key={item.id}>
          <div className="surface-heading">
            <h2>{item.platform}</h2>
            <StatusBadge tone={item.status === 'posted' ? 'good' : item.status === 'skipped' ? 'bad' : 'warn'}>{item.status}</StatusBadge>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Date</span>
              <input type="date" value={item.date} onChange={(event) => workspace.updateCalendarItem(item.id, 'date', event.target.value)} />
            </label>
            <label className="field">
              <span>Time</span>
              <input type="time" value={item.time} onChange={(event) => workspace.updateCalendarItem(item.id, 'time', event.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Status</span>
            <select value={item.status} onChange={(event) => workspace.updateCalendarItem(item.id, 'status', event.target.value)}>
              <option value="planned">planned</option>
              <option value="posted">posted</option>
              <option value="skipped">skipped</option>
              <option value="needs_revision">needs revision</option>
            </select>
          </label>
          <label className="field">
            <span>Schedule notes</span>
            <textarea rows={3} value={item.notes} onChange={(event) => workspace.updateCalendarItem(item.id, 'notes', event.target.value)} />
          </label>
        </section>
      ))}
      <StepActionBar activePage="calendar" onNavigate={onNavigate} />
    </div>
  );
}

function ResultsPage({ datasets, workspace, onNavigate }) {
  const hypotheses = asArray(datasets.experiment_plan?.hypotheses);
  return (
    <div className="page-grid">
      <PageTaskGuide pageId="results" />

      <section className="panel span-2">
        <p className="panel-kicker">Step 4</p>
        <h2>Track results.</h2>
        <p className="lede">Write down enough to decide if you should repeat, change, or stop.</p>
      </section>

      <section className="panel span-2">
        <h2>Manual test plan</h2>
        <div className="split-grid">
          {hypotheses.map((item) => (
            <article className="surface-card" key={item.platform}>
              <div className="surface-heading">
                <h3>{item.platform}</h3>
                <StatusBadge tone="warn">test idea</StatusBadge>
              </div>
              <p>{plainStarterText(item.hypothesis)}</p>
            </article>
          ))}
        </div>
      </section>

      {asArray(workspace.draft.result_logs).map((item) => (
        <section className="panel workspace-result-card" key={item.id}>
          <div className="surface-heading">
            <h2>{item.platform}</h2>
            <StatusBadge tone="neutral">typed by hand</StatusBadge>
          </div>
          <div className="metric-input-grid">
            {[
              ['impressions', 'Impressions'],
              ['saves', 'Saves'],
              ['clicks', 'Clicks'],
              ['replies_comments', 'Replies/comments'],
              ['reposts_shares', 'Reposts/shares'],
              ['conversions', 'Conversions'],
            ].map(([field, label]) => (
              <label className="field" key={field}>
                <span>{label}</span>
                <input type="number" min="0" inputMode="numeric" value={item[field]} onChange={(event) => workspace.updateResultLog(item.id, field, event.target.value)} />
              </label>
            ))}
          </div>
          <label className="field">
            <span>Notes about what happened</span>
            <textarea rows={4} value={item.qualitative_notes} onChange={(event) => workspace.updateResultLog(item.id, 'qualitative_notes', event.target.value)} />
          </label>
        </section>
      ))}
      <StepActionBar activePage="results" onNavigate={onNavigate} />
    </div>
  );
}

function useReviewerDraft(context) {
  const storageKey = `algo-rhythm:reviewer-session:v1:${context.review_id || 'unversioned'}`;
  const [draft, setDraft] = useState(() => {
    const initial = buildInitialReviewerDraft(context);
    if (typeof window === 'undefined') return initial;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return initial;
      const parsed = JSON.parse(saved);
      return {
        ...initial,
        ...parsed,
        checklist: { ...initial.checklist, ...(parsed.checklist || {}) },
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      };
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    const initial = buildInitialReviewerDraft(context);
    if (!draft.selected_run_id && context.recommended_run_id) {
      setDraft((current) => ({ ...initial, ...current, selected_run_id: context.recommended_run_id }));
    }
  }, [context.recommended_run_id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {}
  }, [draft, storageKey]);

  function resetDraft() {
    setDraft(buildInitialReviewerDraft(context));
  }

  function clearDraft() {
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(storageKey); } catch {}
    }
    setDraft(buildInitialReviewerDraft(context));
  }

  return { draft, setDraft, resetDraft, clearDraft, storageKey };
}

function ReviewerWorkspace({ index, datasets, reviewMode, scorecard }) {
  const context = buildReviewContext(index, datasets, reviewMode);
  const { draft, setDraft, resetDraft, clearDraft, storageKey } = useReviewerDraft(context);
  const receipt = buildReviewerReceipt(context, draft);
  const completion = getReviewerCompletionState(draft);
  const canExportReceipt = completion.status === 'complete';
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const downloads = index.downloads || [];
  const packageDownload = downloads.find((item) => item.id === 'latest_package_zip');
  const batchDownload = downloads.find((item) => item.id === 'latest_batch_zip');
  const selectableRuns = scorecard?.ranked_runs?.length
    ? scorecard.ranked_runs.map((run) => run.run_id)
    : context.included_run_ids || [];

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateChecklist(id, value) {
    setDraft((current) => ({
      ...current,
      checklist: { ...current.checklist, [id]: value },
    }));
  }

  function addIssue() {
    setDraft((current) => ({
      ...current,
      issues: [
        ...current.issues,
        { id: `issue_${Date.now()}`, category: 'usability_feedback', summary: '', detail: '' },
      ],
    }));
  }

  function updateIssue(id, field, value) {
    setDraft((current) => ({
      ...current,
      issues: current.issues.map((issue) => (
        issue.id === id ? { ...issue, [field]: value } : issue
      )),
    }));
  }

  function removeIssue(id) {
    setDraft((current) => ({
      ...current,
      issues: current.issues.filter((issue) => issue.id !== id),
    }));
  }

  function downloadJson() {
    if (!canExportReceipt) return;
    const filename = `ALGO_REVIEWER_SESSION__${safeFilenamePart(context.review_id)}__${safeFilenamePart(receipt.reviewer.alias)}.json`;
    downloadTextFile(filename, `${JSON.stringify(receipt, null, 2)}\n`, 'application/json');
  }

  function downloadMarkdown() {
    if (!canExportReceipt) return;
    const filename = `ALGO_REVIEWER_SESSION__${safeFilenamePart(context.review_id)}__${safeFilenamePart(receipt.reviewer.alias)}.md`;
    downloadTextFile(filename, buildReviewerMarkdown(receipt), 'text/markdown');
  }

  return (
    <section className="panel span-2 reviewer-workspace">
      <div className="reviewer-workspace__header">
        <div>
          <p className="panel-kicker">Reviewer task</p>
          <h2>Share an approval decision</h2>
          <p className="lede">
            Use this optional page only when someone asks for approval evidence.
            It makes files you download and send by hand. Nothing is submitted automatically.
          </p>
        </div>
        <div className="reviewer-workspace__actions">
          <button type="button" className="btn btn-outline" onClick={resetDraft}>Reset to current review</button>
          <button type="button" className="btn btn-outline" onClick={clearDraft}>Clear draft</button>
        </div>
      </div>

      <DecisionBrief
        recommendation={datasets.promotion_recommendation}
        scorecard={scorecard}
        reviewMode={reviewMode}
      />

      <div className="reviewer-grid">
        <div className="reviewer-card">
          <h3>Review context</h3>
          <p className="muted">
            This is technical proof for the current recommended plan. Most users can skip it.
          </p>
          <KeyValueTable
            rows={[
              { label: 'Review ID', value: context.review_id || 'Unavailable' },
              { label: 'Mode', value: reviewModeLabel(reviewMode) },
              { label: 'Cohort size', value: context.cohort_size || 'Unavailable' },
              { label: 'Recommended run', value: context.recommended_run_id || 'Unavailable' },
              { label: 'Package', value: context.package_id || 'Unavailable' },
              { label: 'Batch', value: context.batch_id || 'Unavailable' },
            ]}
          />
          <div className="reviewer-downloads">
            {packageDownload?.public_path ? (
              <a className="btn-download" href={`${base}${packageDownload.public_path}`} download={packageDownload.filename}>
                Download package
              </a>
            ) : null}
            {batchDownload?.public_path ? (
              <a className="btn-download" href={`${base}${batchDownload.public_path}`} download={batchDownload.filename}>
                Download batch
              </a>
            ) : null}
          </div>
          <div className="completion-card">
            <div className="completion-card__header">
              <h3>Receipt readiness</h3>
              <StatusBadge tone={canExportReceipt ? 'good' : 'warn'}>
                {canExportReceipt ? 'ready to export' : `${completion.missingFields.length} missing`}
              </StatusBadge>
            </div>
            {completion.missingFields.length ? (
              <ul className="missing-list">
                {completion.missingFields.map((field) => (
                  <li key={field}>{field.replace(/^checklist\./, 'checklist: ').replace(/_/g, ' ')}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">All required reviewer fields are complete.</p>
            )}
          </div>
        </div>

        <form className="reviewer-form">
          <label className="field">
            <span>Reviewer alias</span>
            <input
              type="text"
              value={draft.reviewer_alias}
              onChange={(event) => updateField('reviewer_alias', event.target.value)}
              placeholder="operator, collaborator, reviewer-1"
            />
          </label>

          <div className="field">
            <span>Decision</span>
            <div className="choice-grid">
              {REVIEW_DECISIONS.map((decision) => (
                <label key={decision.id} className="choice-card">
                  <input
                    type="radio"
                    name="reviewer-decision"
                    value={decision.id}
                    checked={draft.decision === decision.id}
                    onChange={(event) => updateField('decision', event.target.value)}
                  />
                  <span>{decision.label}</span>
                  <code>{decision.id}</code>
                </label>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Selected run</span>
              <select value={draft.selected_run_id} onChange={(event) => updateField('selected_run_id', event.target.value)}>
                {selectableRuns.map((runId) => (
                  <option key={runId} value={runId}>{runId}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Confidence</span>
              <select value={draft.confidence} onChange={(event) => updateField('confidence', event.target.value)}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
          </div>

          <div className="field">
            <span>Reviewer checklist</span>
            <div className="checklist-grid">
              {REVIEW_CHECKLIST.map(([id, label]) => (
                <label key={id} className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.checklist[id])}
                    onChange={(event) => updateChecklist(id, event.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="checklist-grid">
            <label className="check-row">
              <input
                type="checkbox"
                checked={Boolean(draft.downloaded_artifacts_acknowledged)}
                onChange={(event) => updateField('downloaded_artifacts_acknowledged', event.target.checked)}
              />
              <span>I understand the package, batch, JSON receipt, and Markdown summary are downloaded files that I must send back manually.</span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={Boolean(draft.needs_operator_explanation)}
                onChange={(event) => updateField('needs_operator_explanation', event.target.checked)}
              />
              <span>I still needed help to understand this.</span>
            </label>
          </div>
        </form>
      </div>

      <div className="issue-intake">
        <div className="section-head">
          <div>
            <h3>Issue intake</h3>
            <p className="muted">Classify feedback before any local action is considered.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={addIssue}>Add issue</button>
        </div>
        {draft.issues.length ? (
          <div className="issue-list">
            {draft.issues.map((issue, index) => (
              <div className="issue-row" key={issue.id}>
                <label className="field">
                  <span>Category {index + 1}</span>
                  <select value={issue.category} onChange={(event) => updateIssue(issue.id, 'category', event.target.value)}>
                    {ISSUE_CATEGORY_OPTIONS.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                  <small>{ISSUE_CATEGORY_OPTIONS.find((category) => category.id === issue.category)?.detail}</small>
                </label>
                <label className="field">
                  <span>Summary</span>
                  <input
                    type="text"
                    value={issue.summary}
                    onChange={(event) => updateIssue(issue.id, 'summary', event.target.value)}
                    placeholder="What happened?"
                  />
                </label>
                <label className="field issue-row__detail">
                  <span>Detail</span>
                  <textarea
                    value={issue.detail}
                    onChange={(event) => updateIssue(issue.id, 'detail', event.target.value)}
                    placeholder="Why it matters, affected page, missing file, or steps to repeat."
                    rows={3}
                  />
                </label>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => removeIssue(issue.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No issues logged" detail="Add usability feedback, content-quality feedback, or a real trigger only if the review exposes one." />
        )}
      </div>

      <label className="field">
        <span>Reviewer notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => updateField('notes', event.target.value)}
          placeholder="What did you understand right away? What still needed help?"
          rows={5}
        />
      </label>

      <div className="receipt-actions">
        <div>
          <h3>Download approval files</h3>
          <p className="muted">
            {canExportReceipt
              ? 'Download both files and send them back by hand.'
              : 'Complete the required fields above before downloading approval files.'}
          </p>
          <p className="muted">Draft key: <code>{storageKey}</code></p>
        </div>
        <div className="reviewer-workspace__actions">
          <button type="button" className="btn btn-primary" onClick={downloadJson} disabled={!canExportReceipt}>Download JSON receipt</button>
          <button type="button" className="btn btn-outline" onClick={downloadMarkdown} disabled={!canExportReceipt}>Download Markdown summary</button>
        </div>
      </div>
    </section>
  );
}

function ReviewPage({ index, datasets }) {
  const recommendation = datasets.promotion_recommendation;
  const scorecard = datasets.run_comparison_scorecard;
  const reviewIndex = datasets.run_review_index;
  const reviewMode = getReviewModeMeta(index, datasets);
  const singleRun = isSingleRunMode(reviewMode);

  return (
    <div className="page-grid">
      <section className="panel span-2 hero-panel">
        <p className="panel-kicker">Optional approval</p>
        <h2>{singleRun ? 'Latest refresh snapshot review' : 'Latest multi-run review recommendation'}</h2>
        <p className="lede">Use this page only when your team needs a record of an approval decision.</p>
        {recommendation ? (
          <>
            <div className="metrics compact">
              <MetricCard label={singleRun ? 'Refresh snapshot run' : 'Recommended run'} value={recommendation.recommended_run_id} tone="good" />
              <MetricCard label="Review mode" value={reviewModeLabel(reviewMode)} tone="warn" />
              <MetricCard label={singleRun ? 'Published snapshots' : 'Promotable runs'} value={reviewMode.cohort_size || (recommendation.promotable_run_ids || []).length} />
            </div>
            <ul className="stack-list">
              {(recommendation.rationale || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState title="Unavailable" detail="Promotion recommendation data is missing." />
        )}
      </section>

      <ReviewerWorkspace
        index={index}
        datasets={datasets}
        reviewMode={reviewMode}
        scorecard={scorecard}
      />

      <section className="panel span-2">
        <h2>{singleRun ? 'Published snapshot' : 'Ranked runs in reviewed cohort'}</h2>
        {scorecard?.ranked_runs?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Run</th>
                  <th>Score</th>
                  <th>Properties</th>
                  <th>Cards</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.ranked_runs.map((run) => (
                  <tr key={run.run_id} className={run.promoted_canonical ? 'tr--promoted' : ''}>
                    <td>{run.rank}</td>
                    <td>{run.run_id}</td>
                    <td>
                      <div className="score-cell">
                        <span>{run.total_score}</span>
                        <div className="score-track">
                          <div
                            className="score-bar"
                            style={{ width: `${Math.min(100, Math.max(0, run.total_score || 0))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{run.selected_platform_count}/{run.target_platform_count}</td>
                    <td>{run.selected_card_count}</td>
                    <td>
                      {run.promoted_canonical
                        ? <StatusBadge tone="good">✓ live</StatusBadge>
                        : <span className="muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Unavailable" detail="Comparison scorecard data is missing." />
        )}
      </section>

      <section className="panel">
        <h2>{singleRun ? 'Out-of-scope runs' : 'Excluded runs'}</h2>
        {reviewIndex?.candidates?.some((item) => item.exclusion_reasons?.length) ? (
          <ul className="stack-list">
            {reviewIndex.candidates
              .filter((item) => item.exclusion_reasons?.length)
              .map((item) => (
                <li key={item.run_id}>
                  <strong>{item.run_id}</strong>
                  <p>{item.exclusion_reasons.join(', ')}</p>
                </li>
              ))}
          </ul>
        ) : (
          <EmptyState title={singleRun ? 'No extra runs' : 'No excluded runs'} detail={singleRun ? 'Beta single-run mode intentionally publishes one refreshed snapshot.' : 'Every candidate was promotable in the latest review.'} />
        )}
      </section>
    </div>
  );
}

function PackagePage({ index, datasets }) {
  const latestPackage = datasets.latest_package;
  const latestReview = datasets.latest_review;
  const manifest = datasets.package_manifest;
  const selectedCards = datasets.selected_signal_cards;
  const reviewMode = getReviewModeMeta(index, datasets);
  const singleRun = isSingleRunMode(reviewMode);
  const packageMatchesReview = Boolean(
    latestPackage?.review_id &&
    latestPackage.review_id === latestReview?.review_id &&
    latestPackage.run_id === reviewMode.recommended_run_id
  );

  return (
    <div className="page-grid">
      <section className="panel span-2 admin-purpose">
        <p className="panel-kicker">Internal check</p>
        <h2>Most users can skip this page.</h2>
        <p>
          This page proves the downloaded package matches the current recommendation.
          It is here for technical checks, not everyday planning.
        </p>
      </section>

      <section className="panel">
        <h2>{singleRun ? 'Single-run package summary' : 'Review-bound package summary'}</h2>
        {latestPackage ? (
          <KeyValueTable
            rows={[
              { label: 'Run ID', value: latestPackage.run_id },
              { label: 'Package ID', value: latestPackage.package_id },
              { label: 'Review ID', value: latestPackage.review_id },
              { label: 'Review mode', value: reviewModeLabel(reviewMode) },
              { label: 'Package SHA', value: <ShaField hash={latestPackage.package_zip_sha256} /> },
            ]}
          />
        ) : (
          <EmptyState title="Unavailable" detail="LATEST_PACKAGE.json did not load." />
        )}
      </section>

      <ReviewMatchStatus
        title="Matches this review"
        matches={packageMatchesReview}
        rows={[
          { label: 'Review ID', value: latestPackage?.review_id || 'Unavailable' },
          { label: 'Expected review ID', value: latestReview?.review_id || 'Unavailable' },
          { label: 'Package run', value: latestPackage?.run_id || 'Unavailable' },
          { label: 'Recommended run', value: reviewMode.recommended_run_id || 'Unavailable' },
          { label: 'Package ZIP SHA', value: <ShaField hash={latestPackage?.package_zip_sha256} /> },
        ]}
      />

      <section className="panel">
        <h2>How it was built</h2>
        {manifest ? (
          <KeyValueTable
            rows={[
              { label: 'Package mode', value: manifest.package_mode },
              { label: 'Review scope', value: manifest.review_scope || reviewMode.review_scope || 'Unavailable' },
              { label: 'Cohort size', value: manifest.cohort_size || reviewMode.cohort_size || 'Unavailable' },
              { label: 'Selected cards', value: manifest.selected_cards?.selected_card_count || 'Unavailable' },
              { label: 'Run manifest SHA', value: <ShaField hash={manifest.run?.run_manifest_sha256} /> },
              { label: 'Package ZIP SHA', value: <ShaField hash={manifest.package_zip?.sha256} /> },
            ]}
          />
        ) : (
          <EmptyState title="Unavailable" detail="Package manifest data is missing." />
        )}
      </section>

      <section className="panel span-2">
        <h2>Cards selected by property</h2>
        {selectedCards?.platforms ? (
          <div className="split-grid">
            {Object.entries(selectedCards.platforms).map(([platform, detail]) => (
              <article className="surface-card" key={platform}>
                <div className="surface-heading">
                  <h3>{platform}</h3>
                  <div className="badge-row">
                    <span className="property-chip">Property</span>
                    <StatusBadge tone="good">{(detail.selected_card_ids || []).length} cards selected</StatusBadge>
                  </div>
                </div>
                <p className="muted">{(detail.selected_card_ids || []).join(', ') || 'Unavailable'}</p>
                <ul className="tight-list">
                  {(detail.selected_cards || []).map((card) => (
                    <li key={card.card_id}>
                      <strong>{card.card_id}</strong>: {card.operator_implication}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Unavailable" detail="Selected signal cards are missing." />
        )}
      </section>
    </div>
  );
}

function BatchPage({ index, datasets }) {
  const latestBatch = datasets.latest_batch;
  const latestReview = datasets.latest_review;
  const batchManifest = datasets.batch_manifest;
  const runPackageIndex = datasets.run_package_index;
  const reviewMode = getReviewModeMeta(index, datasets);
  const singleRun = isSingleRunMode(reviewMode);
  const batchMatchesReview = Boolean(
    latestBatch?.review_id &&
    latestBatch.review_id === latestReview?.review_id &&
    sameStringSet(latestBatch.included_run_ids || [], reviewMode.included_run_ids || [])
  );

  return (
    <div className="page-grid">
      <section className="panel span-2 admin-purpose">
        <p className="panel-kicker">Internal check</p>
        <h2>Most users can skip this page.</h2>
        <p>
          This page proves the reviewed group of files matches the current recommendation.
          It is here for technical checks, not everyday planning.
        </p>
      </section>

      <section className="panel">
        <h2>{singleRun ? 'Single-run batch facts' : 'Reviewed cohort batch facts'}</h2>
        {latestBatch ? (
          <KeyValueTable
            rows={[
              { label: 'Batch ID', value: latestBatch.batch_id },
              { label: 'Review ID', value: latestBatch.review_id },
              { label: 'Review mode', value: reviewModeLabel(reviewMode) },
              { label: 'Included runs', value: (latestBatch.included_run_ids || []).join(', ') || 'Unavailable' },
              { label: 'Batch ZIP SHA', value: <ShaField hash={latestBatch.batch_zip_sha256} /> },
            ]}
          />
        ) : (
          <EmptyState title="Unavailable" detail="LATEST_BATCH.json did not load." />
        )}
      </section>

      <ReviewMatchStatus
        title="Matches this review"
        matches={batchMatchesReview}
        rows={[
          { label: 'Review ID', value: latestBatch?.review_id || 'Unavailable' },
          { label: 'Expected review ID', value: latestReview?.review_id || 'Unavailable' },
          { label: 'Included runs', value: (latestBatch?.included_run_ids || []).join(', ') || 'Unavailable' },
          { label: 'Expected runs', value: (reviewMode.included_run_ids || []).join(', ') || 'Unavailable' },
          { label: 'Batch ZIP SHA', value: <ShaField hash={latestBatch?.batch_zip_sha256} /> },
        ]}
      />

      <section className="panel">
        <h2>How the batch was assembled</h2>
        {batchManifest ? (
          <KeyValueTable
            rows={[
              { label: 'Run package count', value: batchManifest.run_package_count },
              { label: 'Review scope', value: batchManifest.review_scope || reviewMode.review_scope || 'Unavailable' },
              { label: 'Review path', value: batchManifest.review_path },
              { label: 'Batch manifest SHA', value: <ShaField hash={batchManifest.batch_zip?.sha256} /> },
              { label: 'Generated at', value: formatDate(batchManifest.generated_at) },
            ]}
          />
        ) : (
          <EmptyState title="Unavailable" detail="Batch manifest data is missing." />
        )}
      </section>

      <section className="panel span-2">
        <h2>{singleRun ? 'Runs in this single-refresh collection' : 'Runs in this reviewed cohort'}</h2>
        {runPackageIndex?.packages?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Mode</th>
                  <th>Selected cards</th>
                  <th>Package ZIP SHA</th>
                </tr>
              </thead>
              <tbody>
                {runPackageIndex.packages.map((item) => (
                  <tr key={item.run_id}>
                    <td>{item.run_id}</td>
                    <td>{item.package_mode}</td>
                    <td>{item.selected_card_count}</td>
                    <td><ShaField hash={item.package_zip?.sha256} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Unavailable" detail="Run package index data is missing." />
        )}
      </section>
    </div>
  );
}

function HandoffPage({ index }) {
  const downloads = index.downloads || [];
  const downloadGroups = groupedHandoffDownloads(downloads);
  const uiContract = index.ui_contract || {};
  const handoffPacket = index.handoff_packet || {};
  const designAuthority = uiContract.design_authority || {};
  const freshness = index.freshness || {};
  const reviewMode = getReviewModeMeta(index);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <div className="page-grid">
      <section className="panel span-2 admin-purpose">
        <p className="panel-kicker">Internal check</p>
        <h2>Most users can skip this page.</h2>
        <p>
          This page lists downloads and technical proof for the published snapshot.
          It is here for technical checks, not everyday planning.
        </p>
      </section>

      <section className="panel span-2">
        <h2>Files ready to download</h2>
        <div className="handoff-download-groups">
          {downloadGroups.map((group) => (
            <article className="handoff-download-group" key={group.id}>
              <div className="surface-heading">
                <div>
                  <h3>{group.title}</h3>
                  <p className="muted">{group.detail}</p>
                </div>
                <StatusBadge tone={group.items.some((item) => item.bundled) ? 'good' : 'warn'}>
                  {group.items.some((item) => item.bundled) ? 'bundled' : 'reference only'}
                </StatusBadge>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Artifact</th>
                      <th>SHA-256</th>
                      <th>Size</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.label}</td>
                        <td>
                          <ShaField hash={item.sha256} note={item.hash_note} />
                        </td>
                        <td>{formatNumber(item.size_bytes)}</td>
                        <td>
                          {item.bundled && item.public_path ? (
                            <a href={`${base}${item.public_path}`} download={item.filename} className="btn-download">
                              ↓ Download
                            </a>
                          ) : (
                            <span className="btn-not-bundled" title={item.source_path || ''}>Not bundled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Contract metadata</h2>
        <KeyValueTable
          rows={[
            { label: 'Contract version', value: index.contract_version || 'Unavailable' },
            { label: 'Generated at', value: formatDate(index.generated_at) },
            { label: 'Dashboard app', value: index.app?.name || 'Unavailable' },
            { label: 'Data mode', value: index.app?.data_mode || 'Unavailable' },
            { label: 'Review mode', value: reviewModeLabel(reviewMode) },
            { label: 'Audience', value: index.app?.audience || 'Unavailable' },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Missing-data behavior</h2>
        {uiContract.missing_data_behavior ? (
          <KeyValueTable
            rows={[
              { label: 'Required data', value: uiContract.missing_data_behavior.required || 'Unavailable' },
              { label: 'Optional data', value: uiContract.missing_data_behavior.optional || 'Unavailable' },
              { label: 'Stage refresh', value: uiContract.data_refresh?.stage_command || 'Unavailable' },
              { label: 'Promote refresh', value: uiContract.data_refresh?.promote_command || 'Unavailable' },
              { label: 'Sync command', value: uiContract.data_refresh?.sync_command || 'Unavailable' },
              { label: 'Download policy', value: uiContract.download_policy?.source || 'Unavailable' },
            ]}
          />
        ) : (
          <EmptyState title="Unavailable" detail="Contract behavior rules are missing from the dashboard index." />
        )}
      </section>

      <section className="panel span-2">
        <h2>Algo refresh state</h2>
        <KeyValueTable
          rows={[
            { label: 'Mode', value: freshness.mode || 'Unavailable' },
            { label: 'Status', value: <StatusBadge tone={freshness.status === 'fresh' ? 'good' : freshness.status === 'staged' ? 'warn' : 'bad'}>{freshness.status || 'Unavailable'}</StatusBadge> },
            { label: 'Refreshed at', value: formatDate(freshness.refreshed_at) },
            { label: 'Snapshot ID', value: freshness.evidence_snapshot_id || 'Unavailable' },
            { label: 'Source policy', value: freshness.source_policy || 'Unavailable' },
          ]}
        />
      </section>

      <section className="panel span-2">
        <h2>Design authority</h2>
        {Object.entries(designAuthority).length ? (
          <div className="split-grid">
            {Object.entries(designAuthority).map(([id, detail]) => (
              <article className="surface-card" key={id}>
                <div className="surface-heading">
                  <h3>{id.replace(/_/g, ' ')}</h3>
                  <StatusBadge tone="warn">{detail.source}</StatusBadge>
                </div>
                <p>{detail.applies_to}</p>
                <p className="muted">{detail.notes}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Unavailable" detail="No design authority mapping was embedded." />
        )}
      </section>

      <section className="panel span-2">
        <h2>Replit handoff packet</h2>
        {handoffPacket.artifact_name ? (
          <div className="split-grid">
            <article className="surface-card">
              <h3>Runtime files</h3>
              <ul className="tight-list">
                {(handoffPacket.runtime_files || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="surface-card">
              <h3>Brief files</h3>
              <ul className="tight-list">
                {(handoffPacket.brief_files || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        ) : (
          <EmptyState title="Unavailable" detail="No Replit handoff packet metadata was embedded." />
        )}
      </section>
    </div>
  );
}

function ReviewerTaskCallout({ activePage, onNavigate }) {
  return (
    <section className="reviewer-task-callout" aria-label="Reviewer task">
      <div>
        <p className="panel-kicker">Reviewer task</p>
        <h3>Optional approval files</h3>
        <p>
          Use Review Approval only when someone asks for proof of a decision.
          It downloads files you send by hand and does not submit feedback to a server.
        </p>
      </div>
      {activePage !== 'review' ? (
        <button type="button" className="btn btn-primary" onClick={() => onNavigate('review')}>
          Open Review Approval
        </button>
      ) : (
        <StatusBadge tone="good">workspace active</StatusBadge>
      )}
    </section>
  );
}

function App() {
  const { loading, fatalError, index, datasets, optionalErrors } = useDashboardData();

  if (loading) {
    return (
      <div className="shell centered">
        <div className="loading-panel">
          <p className="eyebrow">Algo-Rhythm</p>
          <h1>Loading strategy workspace…</h1>
          <p>Reading starter plan data from the bundled strategy snapshot.</p>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="shell centered">
        <ErrorPanel
          title="Dashboard blocked"
          detail="A required contract file is missing or invalid."
          items={[fatalError]}
        />
      </div>
    );
  }

  return <DashboardShell index={index} datasets={datasets} optionalErrors={optionalErrors} />;
}

function DashboardShell({ index, datasets, optionalErrors }) {
  const [activePage, setActivePage] = useState(currentPageFromLocation);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const workspace = useWorkspaceDraft(index, datasets);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 861px)');
    const handler = (e) => { if (e.matches) setIsSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handler = () => setActivePage(currentPageFromLocation());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const pageDefinitions = useMemo(() => (
    PAGE_ORDER.map((id) => ({
      id,
      label: PAGE_DISPLAY[id]?.label || id,
      subtitle: PAGE_DISPLAY[id]?.subtitle || '',
    }))
  ), []);

  useEffect(() => {
    const validPages = new Set([...PAGE_ORDER, 'overview', 'strategy', 'adminPackage', 'adminBatch', 'adminHandoff']);
    if (!validPages.has(activePage)) {
      setActivePage('workspace');
    }
  }, [activePage]);

  function handleNavigate(pageId) {
    setActivePage(pageId);
    setIsSidebarOpen(false);
    const nextPath = PAGE_PATHS[pageId] || '/workspace';
    pushAppPath(nextPath);
  }

  const activePageMeta = pageDefinitions.find((page) => page.id === activePage);
  const pageIndex = Math.max(0, pageDefinitions.findIndex((page) => page.id === activePage));
  const propertyCount = Object.keys(datasets.selected_signal_cards?.platforms || {}).length;

  const displayLabel = PAGE_DISPLAY[activePage]?.label || activePageMeta?.label || 'Workspace';
  const displayKicker = PAGE_DISPLAY[activePage]?.kicker || '';
  const activeWorkflowStep = getWorkflowStepForPage(activePage);
  const nextWorkflowStep = getNextStep(activePage);

  const renderPage = () => {
    switch (activePage) {
      case 'workspace':
        return <WorkspacePage datasets={datasets} workspace={workspace} onNavigate={handleNavigate} />;
      case 'intake':
        return <IntakePage datasets={datasets} workspace={workspace} onNavigate={handleNavigate} />;
      case 'drafts':
        return <DraftsPage datasets={datasets} workspace={workspace} onNavigate={handleNavigate} />;
      case 'calendar':
        return <CalendarPage workspace={workspace} onNavigate={handleNavigate} />;
      case 'results':
        return <ResultsPage datasets={datasets} workspace={workspace} onNavigate={handleNavigate} />;
      case 'review':
        return <ReviewPage index={index} datasets={datasets} />;
      case 'strategy':
        return <StrategyPage datasets={datasets} />;
      case 'overview':
        return <OverviewPage index={index} datasets={datasets} />;
      case 'adminPackage':
        return <PackagePage index={index} datasets={datasets} />;
      case 'adminBatch':
        return <BatchPage index={index} datasets={datasets} />;
      case 'adminHandoff':
        return <HandoffPage index={index} />;
      default:
        return <WorkspacePage datasets={datasets} workspace={workspace} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="shell">
      <PipelineBar
        pages={pageDefinitions}
        activePage={activePage}
        onNavigate={handleNavigate}
        onHome={() => handleNavigate('workspace')}
        datasets={datasets}
        onHamburger={() => setIsSidebarOpen((o) => !o)}
      />

      <div className="shell-body">
        {isSidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside className={isSidebarOpen ? 'sidebar sidebar--open' : 'sidebar'}>
          <div className="sidebar-top">
            <BrandHeader dataMode={index.app?.data_mode} freshness={index.freshness} />
          </div>

          <nav className="nav-list" aria-label="Dashboard sections">
            {pageDefinitions.map((page) => (
              <button
                key={page.id}
                type="button"
                className={page.id === activePage ? 'nav-item active' : 'nav-item'}
                onClick={() => handleNavigate(page.id)}
              >
                <span>{PAGE_DISPLAY[page.id]?.label || page.label}</span>
                <small>{PAGE_DISPLAY[page.id]?.subtitle || page.subtitle}</small>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <p>Generated {formatDateShort(index.generated_at)}</p>
            {index.contract_version && <p>v{index.contract_version}</p>}
            {propertyCount > 0 && (
              <button
                type="button"
                className="sidebar-link"
                onClick={() => handleNavigate('adminPackage')}
              >
                Advanced checks ({propertyCount} {propertyCount === 1 ? 'item' : 'items'})
              </button>
            )}
            <button
              type="button"
              className="sidebar-link sidebar-link--secondary"
              onClick={() => handleNavigate('strategy')}
            >
              Advanced data
            </button>
            <button
              type="button"
              className="sidebar-link sidebar-link--secondary"
              onClick={() => handleNavigate('adminHandoff')}
            >
              Advanced files
            </button>
          </div>
        </aside>

        <main className="content">
          <div className="data-rail">
            <div className="rail-cell rail-cell--promoted">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Project status</span>
                  <span className="rail-label__short">STATUS</span>
                </span>
                <span className="rail-icon rail-icon--promoted">{STRIP_ICONS.promoted}</span>
              </div>
              <code className="rail-value rail-value--promoted">{workspace.draft.project?.status || 'planning'}</code>
            </div>
            <div className="rail-divider" />
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Target platforms</span>
                  <span className="rail-label__short">PLATFORMS</span>
                </span>
                <span className="rail-icon">{STRIP_ICONS.latest}</span>
              </div>
              <code className="rail-value">{asArray(workspace.draft.intake?.target_platforms).length}</code>
            </div>
            <div className="rail-divider" />
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Draft style</span>
                  <span className="rail-label__short">STYLE</span>
                </span>
                <span className="rail-icon">{STRIP_ICONS.recommended}</span>
              </div>
              <code className="rail-value">{draftStyleLabel(workspace.draft.selected_draft_tier)}</code>
            </div>
            <div className="rail-divider" />
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Download plan</span>
                  <span className="rail-label__short">SAVE</span>
                </span>
                <span className="rail-icon">{STRIP_ICONS.package}</span>
              </div>
              <code className="rail-value">{workspace.draft.export_status?.acknowledged ? 'ready' : 'draft'}</code>
            </div>
            {propertyCount > 0 && (
              <>
                <div className="rail-divider" />
                <div className="rail-cell">
                  <div className="rail-label-row">
                    <span className="rail-label">
                      <span className="rail-label__full">Active properties</span>
                      <span className="rail-label__short">PROPS</span>
                    </span>
                    <span className="rail-icon">{STRIP_ICONS.properties}</span>
                  </div>
                  <code className="rail-value">{propertyCount}</code>
                </div>
              </>
            )}
          </div>

          <header className="content-header">
            <div className="header-left">
              <p className="eyebrow">
                {activeWorkflowStep
                  ? `Step ${activeWorkflowStep.number} of 5: ${activeWorkflowStep.label}`
                  : `${pageIndex + 1} / ${pageDefinitions.length} · ${displayKicker}`}
              </p>
              <h2 className="page-title">{displayLabel}</h2>
              <p className="header-note">
                {activeWorkflowStep
                  ? `Next: ${activePage === 'workspace' ? 'Start: Check Idea' : nextWorkflowStep.label} · Saved in this browser · No social account connection`
                  : 'Saved in this browser · Manual posting workflow · No social account connection'}
              </p>
            </div>
            <div className="header-right">
              <div className="header-badges-inline">
                <StatusBadge tone="good">{index.status || 'PASS'}</StatusBadge>
                <StatusBadge tone="good">download first</StatusBadge>
                {Object.keys(optionalErrors).length > 0 && (
                  <StatusBadge tone="warn">Optional gaps</StatusBadge>
                )}
              </div>
            </div>
          </header>

          <WorkspaceTaskCallout activePage={activePage} onNavigate={handleNavigate} />

          {Object.keys(optionalErrors).length > 0 && (
            <details className="optional-errors">
              <summary>
                {Object.keys(optionalErrors).length} optional dataset{Object.keys(optionalErrors).length !== 1 ? 's' : ''} unavailable — expand for details
              </summary>
              <ul>
                {Object.entries(optionalErrors).map(([id, msg]) => (
                  <li key={id}><strong>{id}:</strong> {msg}</li>
                ))}
              </ul>
            </details>
          )}

          <div key={activePage}>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingShell({ title = 'Loading strategy workspace…', detail = 'Preparing your signed-in workspace.' }) {
  return (
    <div className="shell centered">
      <div className="loading-panel">
        <p className="eyebrow">Algo-Rhythm</p>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function AuthConfigError() {
  return (
    <div className="shell centered">
      <ErrorPanel
        title="Authentication is not configured"
        detail="VITE_CLERK_PUBLISHABLE_KEY is required before the protected dashboard can render."
        items={[
          'Set VITE_CLERK_PUBLISHABLE_KEY in Vercel production env vars.',
          'Use the dedicated Algo-Rhythm Clerk instance, not ThetaFrame credentials.',
          'Do not commit raw Clerk, Vercel, or Cloudflare secrets.',
        ]}
      />
    </div>
  );
}

function AuthBrandPanel({ mode }) {
  return (
    <section className="auth-brand-panel">
      <div className="auth-brand-panel__mark">
        <AlgoRhythmLogo size={44} />
      </div>
      <div>
        <p className="eyebrow">Algo-Rhythm</p>
        <h1>{mode === 'sign-up' ? 'Request workspace access' : 'Sign in to Algo-Rhythm'}</h1>
        <p>
          Social strategy workspace for turning one source idea into a manual posting plan.
          Clerk protects the UI; starter plan data and bundled downloads remain file-based snapshots.
        </p>
      </div>
      <div className="auth-limits">
        <StatusBadge tone="good">Clerk UI gate</StatusBadge>
        <StatusBadge tone="warn">static assets remain direct-public</StatusBadge>
      </div>
    </section>
  );
}

function SignInPage() {
  return (
    <main className="auth-page">
      <AuthBrandPanel mode="sign-in" />
      <div className="auth-clerk-card">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={workspaceRedirectUrl}
        />
      </div>
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="auth-page">
      <AuthBrandPanel mode="sign-up" />
      <div className="auth-clerk-card">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          fallbackRedirectUrl={workspaceRedirectUrl}
        />
      </div>
    </main>
  );
}

function SignedInRoute({ routePath }) {
  useEffect(() => {
    if (isAuthPath(routePath)) pushAppPath('/workspace', true);
  }, [routePath]);

  if (isAuthPath(routePath)) {
    return <LoadingShell title="Opening strategy workspace…" detail="Your Clerk session is active." />;
  }

  return <App />;
}

function SignedOutRoute({ routePath }) {
  useEffect(() => {
    if (!isAuthPath(routePath)) pushAppPath('/sign-in', true);
  }, [routePath]);

  if (!isAuthPath(routePath)) {
    return <LoadingShell title="Opening sign-in…" detail="Clerk protects dashboard routes." />;
  }

  if (routePath.startsWith('/sign-up')) return <SignUpPage />;
  return <SignInPage />;
}

function AuthenticatedApp() {
  const [routePath, setRoutePath] = useState(normalizedLocationPath);

  useEffect(() => {
    const handler = () => setRoutePath(normalizedLocationPath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (!clerkPubKey) return <AuthConfigError />;

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={workspaceRedirectUrl}
      signUpFallbackRedirectUrl={workspaceRedirectUrl}
      routerPush={(to) => pushAppPath(stripBase(to))}
      routerReplace={(to) => pushAppPath(stripBase(to), true)}
    >
      <ClerkLoading>
        <LoadingShell />
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-in">
          <SignedInRoute routePath={routePath} />
        </Show>
        <Show when="signed-out">
          <SignedOutRoute routePath={routePath} />
        </Show>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default AuthenticatedApp;
