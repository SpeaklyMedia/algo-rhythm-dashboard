// @ts-nocheck
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

const PAGE_ORDER = ['overview', 'strategy', 'review', 'package', 'batch', 'handoff'];

const PAGE_DATA_KEYS = {
  overview: ['latest_run', 'latest_review', 'latest_package', 'latest_batch'],
  strategy: ['content_object', 'trend_shortlist', 'viability_scorecard'],
  review: ['promotion_recommendation', 'run_comparison_scorecard'],
  package: ['latest_package', 'selected_signal_cards'],
  batch: ['latest_batch', 'run_package_index'],
  handoff: [],
};

function pageHasData(pageId, datasets) {
  const keys = PAGE_DATA_KEYS[pageId] || [];
  if (keys.length === 0) return true;
  return keys.some((key) => datasets[key] != null);
}

const STRIP_ICONS = {
  promoted: '↑ P',
  latest: '✓ L',
  recommended: '⊙ R',
  package: '▣ K',
  properties: '◈ X',
};

const HOME_LANES = [
  {
    id: 'overview',
    label: 'Health Check',
    desc: "See what's running, what's promoted, and whether anything needs attention before you proceed.",
  },
  {
    id: 'strategy',
    label: 'Content Strategy',
    desc: 'Understand the topics, trends, and platform allocations driving the content plan for this run.',
  },
  {
    id: 'review',
    label: 'Promotion Review',
    desc: 'Compare all runs in the cycle and confirm which one should advance to packaging.',
  },
  {
    id: 'package',
    label: "What's in the Package",
    desc: 'Inspect every card bundled, the signals picked, and how the package was constructed.',
  },
  {
    id: 'batch',
    label: 'Run Collection',
    desc: 'Review all runs included in this cycle — modes, counts, and SHA integrity checks.',
  },
  {
    id: 'handoff',
    label: 'Delivery & Downloads',
    desc: 'Verify artifact integrity, download files, and confirm the canonical handoff is complete.',
  },
];

const PAGE_DISPLAY = {
  overview: {
    label: 'Health Check',
    shortLabel: 'Health',
    subtitle: "See what's running, what's promoted, and whether anything needs attention",
    kicker: 'Pipeline status',
  },
  strategy: {
    label: 'Content Strategy',
    shortLabel: 'Strategy',
    subtitle: 'Understand the plan behind this run — topics, trends, platforms, and scores',
    kicker: 'Strategic substrate',
  },
  review: {
    label: 'Promotion Review',
    shortLabel: 'Review',
    subtitle: 'Compare all the runs and confirm which one should move forward',
    kicker: 'Make your call',
  },
  package: {
    label: "What's in the Package",
    shortLabel: 'Package',
    subtitle: 'See exactly what got bundled, which cards were picked, and how it was built',
    kicker: 'Package contents',
  },
  batch: {
    label: 'Run Collection',
    shortLabel: 'Batch',
    subtitle: 'All runs included in this review cycle — modes, counts, and SHA verification',
    kicker: 'Batch cohort',
  },
  handoff: {
    label: 'Delivery & Downloads',
    shortLabel: 'Delivery',
    subtitle: 'Get your files, verify artifact integrity, and confirm handoff is complete',
    kicker: 'Canonical handoff',
  },
};

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
      {/* EQ waveform bars — algorithmic element (left) */}
      <line x1="3.5" y1="24" x2="3.5" y2="17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8.5" y1="24" x2="8.5" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="13.5" y1="24" x2="13.5" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Single quarter note — music element (right) */}
      <ellipse cx="23.5" cy="24" rx="4" ry="2.8" fill="currentColor" transform="rotate(-15 23.5 24)" />
      <line x1="27.2" y1="23" x2="27.2" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BrandHeader({ dataMode }) {
  return (
    <div className="brand-header">
      <div className="brand-header__row">
        <AlgoRhythmLogo size={30} className="brand-header__logo" />
        <span className="brand-header__wordmark">Algo-Rhythm</span>
      </div>
      <p className="brand-header__context">Lane B · Internal review</p>
      <div className="mode-labels">
        <span className="mode-label">{dataMode || 'static_json'}</span>
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
        className={`pipeline-brand${activePage === 'home' ? ' pipeline-brand--active' : ''}`}
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

  return (
    <div className="page-grid">
      <section className="panel span-2 hero-panel">
        <p className="panel-kicker">Pipeline status</p>
        <h2>Lane B delivery posture</h2>
        <p className="lede">
          The promoted alias, latest successful run, current review recommendation, and package/batch pointers are
          frozen into the static contract. All data below reads from bundled JSON only.
        </p>
        <div className="stat-row">
          <div className="stat-item stat-item--good">
            <span className="stat-label">Currently live</span>
            <code className="stat-value">{summary.top_level_alias_run_id || '—'}</code>
            <span className="stat-detail">{(summary.top_level_alias_candidate_ids || []).join(', ') || 'No candidates'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item stat-item--warn">
            <span className="stat-label">Most recent run</span>
            <code className="stat-value">{latestRun?.latest_successful_run_id || '—'}</code>
            <span className="stat-detail">{latestRun?.run_manifest_path || 'No path'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item stat-item--warn">
            <span className="stat-label">Recommended pick</span>
            <code className="stat-value">{latestReview?.recommended_run_id || '—'}</code>
            <span className="stat-detail">{latestReview?.review_id || 'No review ID'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item stat-item--good">
            <span className="stat-label">Packaged & ready</span>
            <code className="stat-value">{latestPackage?.run_id || '—'}</code>
            <span className="stat-detail">{latestPackage?.package_id || 'No package ID'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-label">Batch review</span>
            <code className="stat-value">{latestBatch?.review_id || '—'}</code>
            <span className="stat-detail">{`${latestBatch?.included_run_ids?.length || 0} included runs`}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Package integrity</h2>
        <KeyValueTable
          rows={[
            { label: 'Run ID', value: latestPackage?.run_id || 'Unavailable' },
            { label: 'Package ID', value: latestPackage?.package_id || 'Unavailable' },
            { label: 'Manifest SHA', value: latestPackage?.package_manifest_sha256 || 'Unavailable' },
            { label: 'Package SHA', value: latestPackage?.package_zip_sha256 || 'Unavailable' },
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
            { label: 'Batch ZIP SHA', value: latestBatch?.batch_zip_sha256 || 'Unavailable' },
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
        <h2>Contract warnings</h2>
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
    </div>
  );
}

function ReviewPage({ datasets }) {
  const recommendation = datasets.promotion_recommendation;
  const scorecard = datasets.run_comparison_scorecard;
  const reviewIndex = datasets.run_review_index;

  return (
    <div className="page-grid">
      <section className="panel span-2 hero-panel">
        <p className="panel-kicker">Make your call</p>
        <h2>Latest review recommendation</h2>
        {recommendation ? (
          <>
            <div className="metrics compact">
              <MetricCard label="Recommended run" value={recommendation.recommended_run_id} tone="good" />
              <MetricCard label="Promotion mode" value={recommendation.promotion_mode} tone="warn" />
              <MetricCard label="Promotable runs" value={(recommendation.promotable_run_ids || []).length} />
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
        <h2>Ranked runs</h2>
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
        <h2>Excluded runs</h2>
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
          <EmptyState title="No excluded runs" detail="Every candidate was promotable in the latest review." />
        )}
      </section>
    </div>
  );
}

function PackagePage({ datasets }) {
  const latestPackage = datasets.latest_package;
  const manifest = datasets.package_manifest;
  const selectedCards = datasets.selected_signal_cards;

  return (
    <div className="page-grid">
      <section className="panel">
        <h2>Package summary</h2>
        {latestPackage ? (
          <KeyValueTable
            rows={[
              { label: 'Run ID', value: latestPackage.run_id },
              { label: 'Package ID', value: latestPackage.package_id },
              { label: 'Review ID', value: latestPackage.review_id },
              { label: 'Package SHA', value: latestPackage.package_zip_sha256 },
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
              { label: 'Selected cards', value: manifest.selected_cards?.selected_card_count || 'Unavailable' },
              { label: 'Run manifest SHA', value: manifest.run?.run_manifest_sha256 || 'Unavailable' },
              { label: 'Package ZIP SHA', value: manifest.package_zip?.sha256 || 'Unavailable' },
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

function BatchPage({ datasets }) {
  const latestBatch = datasets.latest_batch;
  const batchManifest = datasets.batch_manifest;
  const runPackageIndex = datasets.run_package_index;

  return (
    <div className="page-grid">
      <section className="panel">
        <h2>Batch facts</h2>
        {latestBatch ? (
          <KeyValueTable
            rows={[
              { label: 'Batch ID', value: latestBatch.batch_id },
              { label: 'Review ID', value: latestBatch.review_id },
              { label: 'Included runs', value: (latestBatch.included_run_ids || []).join(', ') || 'Unavailable' },
              { label: 'Batch ZIP SHA', value: latestBatch.batch_zip_sha256 || 'Unavailable' },
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
              { label: 'Review path', value: batchManifest.review_path },
              { label: 'Batch manifest SHA', value: batchManifest.batch_zip?.sha256 || 'Unavailable' },
              { label: 'Generated at', value: formatDate(batchManifest.generated_at) },
            ]}
          />
        ) : (
          <EmptyState title="Unavailable" detail="Batch manifest data is missing." />
        )}
      </section>

      <section className="panel span-2">
        <h2>Runs in this collection</h2>
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
                    <td>{item.package_zip?.sha256 || 'Unavailable'}</td>
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
                    <code>{item.sha256 || 'Unavailable'}</code>
                    {item.hash_note ? <p className="muted">{item.hash_note}</p> : null}
                  </td>
                  <td>{formatNumber(item.size_bytes)}</td>
                  <td>
                    {item.bundled && item.public_path ? (
                      <a href={`${base}${item.public_path}`} download={item.filename} className="btn-download">
                        → {item.filename}
                      </a>
                    ) : (
                      <span className="muted">Unavailable</span>
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
              { label: 'Refresh command', value: uiContract.data_refresh?.command || 'Unavailable' },
              { label: 'Download policy', value: uiContract.download_policy?.source || 'Unavailable' },
            ]}
          />
        ) : (
          <EmptyState title="Unavailable" detail="Contract behavior rules are missing from the dashboard index." />
        )}
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

function HomePage({ onNavigate }) {
  return (
    <div className="home-page">
      <section className="home-hero panel">
        <div className="home-hero__logo-wrap" aria-hidden="true">
          <AlgoRhythmLogo size={64} className="home-hero__logo" />
        </div>
        <div className="home-hero__copy">
          <p className="eyebrow">Internal review tool</p>
          <h1 className="home-hero__title">Algo-Rhythm</h1>
          <p className="home-hero__pitch">
            A frozen, static review dashboard for the Lane B algorithmic content pipeline.
            Inspect the full delivery cycle — from strategic substrate to canonical handoff —
            using a bundled snapshot. All data is embedded at build time.
            No live API. No backend dependencies.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('overview')}
          >
            Begin at Health Check →
          </button>
        </div>
      </section>

      <section className="home-lanes">
        <h2 className="home-lanes__heading">Six stages of the review cycle</h2>
        <div className="home-lanes__grid">
          {HOME_LANES.map((lane, i) => (
            <article className="home-lane-card surface-card" key={lane.id}>
              <div className="home-lane-card__num">{i + 1}</div>
              <div className="home-lane-card__body">
                <h3 className="home-lane-card__title">{lane.label}</h3>
                <p className="home-lane-card__desc">{lane.desc}</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => onNavigate(lane.id)}
                >
                  Go to →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <p>
          This dashboard reads from a static bundled contract — a frozen snapshot of the Lane B
          pipeline seeded at review time. No network calls are made after initial page load.
          All data is read-only and cannot be modified from this interface.
        </p>
      </footer>
    </div>
  );
}

function App() {
  const { loading, fatalError, index, datasets, optionalErrors } = useDashboardData();
  const [activePage, setActivePage] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 861px)');
    const handler = (e) => { if (e.matches) setIsSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const pageDefinitions = useMemo(() => {
    if (!index?.navigation) return [];
    return PAGE_ORDER.map((id) => index.navigation.find((page) => page.id === id)).filter(Boolean);
  }, [index]);

  useEffect(() => {
    if (!pageDefinitions.length) return;
    if (activePage !== 'home' && !pageDefinitions.some((page) => page.id === activePage)) {
      setActivePage('home');
    }
  }, [activePage, pageDefinitions]);

  function handleNavigate(pageId) {
    setActivePage(pageId);
    setIsSidebarOpen(false);
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
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'strategy':
        return <StrategyPage datasets={datasets} />;
      case 'review':
        return <ReviewPage datasets={datasets} />;
      case 'package':
        return <PackagePage datasets={datasets} />;
      case 'batch':
        return <BatchPage datasets={datasets} />;
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
        onHome={() => handleNavigate('home')}
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
            <BrandHeader dataMode={index.app?.data_mode} />
          </div>

          <nav className="nav-list" aria-label="Dashboard sections">
            <button
              type="button"
              className={activePage === 'home' ? 'nav-item nav-item--home active' : 'nav-item nav-item--home'}
              onClick={() => handleNavigate('home')}
            >
              <span>Home</span>
              <small>Welcome · orientation · stage overview</small>
            </button>
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

        <main className={activePage === 'home' ? 'content content--home' : 'content'}>
          {activePage !== 'home' && <>
          <div className="data-rail">
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Currently live</span>
                  <span className="rail-label__short">LIVE</span>
                </span>
                <span className="rail-icon">{STRIP_ICONS.promoted}</span>
              </div>
              <code className="rail-value">{summary.top_level_alias_run_id || '—'}</code>
            </div>
            <div className="rail-divider" />
            <div className="rail-cell">
              <div className="rail-label-row">
                <span className="rail-label">
                  <span className="rail-label__full">Most recent run</span>
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
                  <span className="rail-label__full">Recommended pick</span>
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
                  <span className="rail-label__full">Packaged & ready</span>
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
              <p className="header-note">Bundled JSON only · No live API · No raw repo reads</p>
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
          </>}

          <div key={activePage}>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
