// @ts-nocheck
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

const PAGE_ORDER = ['overview', 'strategy', 'review', 'package', 'batch', 'handoff'];
const PAGE_PATHS = {
  overview: '/',
  strategy: '/strategy',
  review: '/review',
  package: '/package',
  batch: '/batch',
  handoff: '/handoff',
};

const PAGE_DATA_KEYS = {
  overview: ['latest_run', 'latest_review', 'latest_package', 'latest_batch'],
  strategy: ['content_object', 'trend_shortlist', 'platform_signal_selection', 'viability_scorecard', 'four_tier_adaptations', 'experiment_plan', 'campaign_ledger_seed'],
  review: ['promotion_recommendation', 'run_comparison_scorecard', 'run_review_index'],
  package: ['latest_package', 'package_manifest'],
  batch: ['latest_batch', 'batch_manifest'],
  handoff: [],
};

function pageHasData(pageId, datasets) {
  const keys = PAGE_DATA_KEYS[pageId] || [];
  if (keys.length === 0) return true;
  return keys.some((key) => datasets[key] != null);
}

function pageFromPathname(pathname) {
  const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (normalized === '/') return 'overview';
  const pageId = normalized.slice(1);
  return PAGE_ORDER.includes(pageId) ? pageId : 'overview';
}

function currentPageFromLocation() {
  if (typeof window === 'undefined') return 'overview';
  return pageFromPathname(window.location.pathname);
}

const STRIP_ICONS = {
  promoted: 'LIVE',
  latest: 'LATEST',
  recommended: 'PICK',
  package: 'PKG',
  properties: 'PROPS',
};

const PAGE_DISPLAY = {
  overview: {
    label: 'Overview',
    shortLabel: 'Overview',
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
    label: 'Review',
    shortLabel: 'Review',
    subtitle: 'Promotion recommendation · cohort shape · ranked runs or single refresh snapshot',
    kicker: 'Review recommendation',
  },
  package: {
    label: 'Package',
    shortLabel: 'Package',
    subtitle: 'Latest package facts · manifest integrity · selected signal cards by property',
    kicker: 'Latest package',
  },
  batch: {
    label: 'Batch',
    shortLabel: 'Batch',
    subtitle: 'Single-run batch or reviewed cohort · package modes · card counts · SHA verification',
    kicker: 'Latest batch',
  },
  handoff: {
    label: 'Handoff',
    shortLabel: 'Handoff',
    subtitle: 'Canonical downloads · contract metadata · design authority · handoff packet',
    kicker: 'Canonical handoff',
  },
};

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

function CopyButton({ value }) {
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
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? '✓' : 'copy'}
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
      <ThemeToggle />
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

function ReviewPage({ index, datasets }) {
  const recommendation = datasets.promotion_recommendation;
  const scorecard = datasets.run_comparison_scorecard;
  const reviewIndex = datasets.run_review_index;
  const reviewMode = getReviewModeMeta(index, datasets);
  const singleRun = isSingleRunMode(reviewMode);

  return (
    <div className="page-grid">
      <section className="panel span-2 hero-panel">
        <p className="panel-kicker">Make your call</p>
        <h2>{singleRun ? 'Latest refresh snapshot review' : 'Latest multi-run review recommendation'}</h2>
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
  const manifest = datasets.package_manifest;
  const selectedCards = datasets.selected_signal_cards;
  const reviewMode = getReviewModeMeta(index, datasets);
  const singleRun = isSingleRunMode(reviewMode);

  return (
    <div className="page-grid">
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
  const batchManifest = datasets.batch_manifest;
  const runPackageIndex = datasets.run_package_index;
  const reviewMode = getReviewModeMeta(index, datasets);
  const singleRun = isSingleRunMode(reviewMode);

  return (
    <div className="page-grid">
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
  const uiContract = index.ui_contract || {};
  const handoffPacket = index.handoff_packet || {};
  const designAuthority = uiContract.design_authority || {};
  const freshness = index.freshness || {};
  const reviewMode = getReviewModeMeta(index);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <h2>Files ready to download</h2>
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
              {downloads.map((item) => (
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

function App() {
  const { loading, fatalError, index, datasets, optionalErrors } = useDashboardData();
  const [activePage, setActivePage] = useState(currentPageFromLocation);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const pageDefinitions = useMemo(() => {
    if (!index?.navigation) return [];
    return PAGE_ORDER.map((id) => index.navigation.find((page) => page.id === id)).filter(Boolean);
  }, [index]);

  useEffect(() => {
    if (!pageDefinitions.length) return;
    if (!pageDefinitions.some((page) => page.id === activePage)) {
      setActivePage(pageDefinitions[0]?.id || 'overview');
    }
  }, [activePage, pageDefinitions]);

  function handleNavigate(pageId) {
    setActivePage(pageId);
    setIsSidebarOpen(false);
    const nextPath = PAGE_PATHS[pageId] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }

  if (loading) {
    return (
      <div className="shell centered">
        <div className="loading-panel">
          <p className="eyebrow">Algo-Rhythm</p>
          <h1>Loading review dashboard…</h1>
          <p>Reading static seeded data from the bundled handoff surface.</p>
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

  const activePageMeta = pageDefinitions.find((page) => page.id === activePage);
  const pageIndex = pageDefinitions.findIndex((page) => page.id === activePage);
  const summary = index.summary || {};
  const propertyCount = Object.keys(datasets.selected_signal_cards?.platforms || {}).length;

  const displayLabel = PAGE_DISPLAY[activePage]?.label || activePageMeta?.label || 'Dashboard';
  const displayKicker = PAGE_DISPLAY[activePage]?.kicker || '';

      const renderPage = () => {
    switch (activePage) {
      case 'strategy':
        return <StrategyPage datasets={datasets} />;
      case 'review':
        return <ReviewPage index={index} datasets={datasets} />;
      case 'package':
        return <PackagePage index={index} datasets={datasets} />;
      case 'batch':
        return <BatchPage index={index} datasets={datasets} />;
      case 'handoff':
        return <HandoffPage index={index} />;
      default:
        return <OverviewPage index={index} datasets={datasets} />;
    }
  };

  return (
    <div className="shell">
      <PipelineBar
        pages={pageDefinitions}
        activePage={activePage}
        onNavigate={handleNavigate}
        onHome={() => handleNavigate('overview')}
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
                onClick={() => handleNavigate('package')}
              >
                {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
              </button>
            )}
            <button
              type="button"
              className="sidebar-link sidebar-link--secondary"
              onClick={() => handleNavigate('handoff')}
            >
              Design authority →
            </button>
          </div>
        </aside>

        <main className="content">
          <div className="data-rail">
            <div className="rail-cell rail-cell--promoted">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Promoted alias</span>
                  <span className="rail-label__short">ALIAS</span>
                </span>
                <span className="rail-icon rail-icon--promoted">{STRIP_ICONS.promoted}</span>
              </div>
              <code className="rail-value rail-value--promoted">{summary.top_level_alias_run_id || '—'}</code>
            </div>
            <div className="rail-divider" />
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Latest successful run</span>
                  <span className="rail-label__short">LATEST</span>
                </span>
                <span className="rail-icon">{STRIP_ICONS.latest}</span>
              </div>
              <code className="rail-value">{summary.latest_successful_run_id || '—'}</code>
            </div>
            <div className="rail-divider" />
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Review recommendation</span>
                  <span className="rail-label__short">PICK</span>
                </span>
                <span className="rail-icon">{STRIP_ICONS.recommended}</span>
              </div>
              <code className="rail-value">{summary.latest_review_recommended_run_id || '—'}</code>
            </div>
            <div className="rail-divider" />
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Latest package</span>
                  <span className="rail-label__short">PKG</span>
                </span>
                <span className="rail-icon">{STRIP_ICONS.package}</span>
              </div>
              <code className="rail-value">{summary.latest_package_run_id || '—'}</code>
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
                {pageIndex + 1} / {pageDefinitions.length} · {displayKicker}
              </p>
              <h2 className="page-title">{displayLabel}</h2>
              <p className="header-note">Bundled JSON snapshot · Operator-triggered refresh · No live API</p>
            </div>
            <div className="header-right">
              <div className="header-badges-inline">
                <StatusBadge tone="good">{index.status || 'PASS'}</StatusBadge>
                <StatusBadge tone="good">review bound</StatusBadge>
                {Object.keys(optionalErrors).length > 0 && (
                  <StatusBadge tone="warn">Optional gaps</StatusBadge>
                )}
              </div>
            </div>
          </header>

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

export default App;
