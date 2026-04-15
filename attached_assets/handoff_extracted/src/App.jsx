import { useEffect, useMemo, useState } from 'react';

const PAGE_ORDER = ['overview', 'strategy', 'review', 'package', 'batch', 'handoff'];
const PAGE_LEADS = {
  overview: 'Promoted, latest, reviewed, packaged, and batched states should be visible without opening raw manifests.',
  strategy: 'Show the content brief, trend assumptions, platform signals, viability rubric, and execution layers from the static contract only.',
  review: 'Make the recommendation, ranked cohort, and exclusions legible enough for manual promotion review.',
  package: 'Expose the latest package facts, selected cards, and package-mode semantics without requiring zip inspection.',
  batch: 'Show the reviewed cohort, package modes, and retained batch facts with promoted vs promotable separation.',
  handoff: 'Present the current downloads, contract metadata, design authority, and Replit packet contents as a closed handoff surface.',
};

function formatDate(value) {
  if (!value) return 'Unavailable';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  return new Intl.NumberFormat().format(value);
}

function statusTone(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('pass') || normalized.includes('ready') || normalized.includes('promoted') || normalized.includes('canonical')) {
    return 'good';
  }
  if (normalized.includes('warn') || normalized.includes('manual') || normalized.includes('latest') || normalized.includes('recommended')) {
    return 'warn';
  }
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
    <dl className="key-value-grid">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
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
        const indexResponse = await fetch('/data/dashboard_index.json', { cache: 'no-store' });
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
              const response = await fetch(meta.public_path, { cache: 'no-store' });
              if (!response.ok) {
                throw new Error(`fetch failed (${response.status})`);
              }
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
          setState({
            loading: false,
            fatalError: `Required datasets failed to load: ${requiredErrors.join('; ')}`,
            index,
            datasets,
            optionalErrors,
          });
          return;
        }

        setState({
          loading: false,
          fatalError: null,
          index,
          datasets,
          optionalErrors,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          loading: false,
          fatalError: error.message,
          index: null,
          datasets: {},
          optionalErrors: {},
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
        <p className="panel-kicker">Current contract state</p>
        <h2>Lane B delivery posture</h2>
        <p className="lede">
          The promoted alias, latest successful run, current review recommendation, and package/batch pointers are
          frozen into the static contract. Replit should render from this surface only.
        </p>
        <div className="metrics">
          <MetricCard
            label="Top-level alias run"
            value={summary.top_level_alias_run_id || 'Unavailable'}
            detail={`Candidates: ${(summary.top_level_alias_candidate_ids || []).join(', ') || 'none'}`}
            tone="good"
          />
          <MetricCard
            label="Latest successful run"
            value={latestRun?.latest_successful_run_id || 'Unavailable'}
            detail={latestRun?.run_manifest_path || ''}
            tone="warn"
          />
          <MetricCard
            label="Review recommendation"
            value={latestReview?.recommended_run_id || 'Unavailable'}
            detail={latestReview?.review_id || ''}
            tone="warn"
          />
          <MetricCard
            label="Latest package run"
            value={latestPackage?.run_id || 'Unavailable'}
            detail={latestPackage?.package_id || ''}
            tone="good"
          />
          <MetricCard
            label="Latest batch review"
            value={latestBatch?.review_id || 'Unavailable'}
            detail={`${latestBatch?.included_run_ids?.length || 0} included runs`}
          />
        </div>
      </section>

      <section className="panel">
        <h2>Review-bound package state</h2>
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
        <h2>Batch state</h2>
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
            <KeyValueTable
              rows={Object.entries(scorecard.dimensions || {}).map(([label, detail]) => ({
                label,
                value: `${detail.score} — ${detail.reason}`,
              }))}
            />
          </>
        ) : (
          <EmptyState title="Unavailable" detail="Viability scorecard data is missing." />
        )}
      </section>

      <section className="panel span-2">
        <h2>Platform selections</h2>
        {selection?.platforms ? (
          <div className="split-grid">
            {Object.entries(selection.platforms).map(([platform, detail]) => (
              <article className="surface-card" key={platform}>
                <div className="surface-heading">
                  <h3>{platform}</h3>
                  <StatusBadge tone="good">selected</StatusBadge>
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
        <h2>Adaptations</h2>
        {adaptations ? <JsonCode value={adaptations} /> : <EmptyState title="Unavailable" detail="Adaptation data is missing." />}
      </section>

      <section className="panel">
        <h2>Experiment plan</h2>
        {experiment ? <JsonCode value={experiment} /> : <EmptyState title="Unavailable" detail="Experiment plan data is missing." />}
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
        <p className="panel-kicker">Manual promotion surface</p>
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
                  <th>Total</th>
                  <th>Platforms</th>
                  <th>Cards</th>
                  <th>Promoted</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.ranked_runs.map((run) => (
                  <tr key={run.run_id}>
                    <td>{run.rank}</td>
                    <td>{run.run_id}</td>
                    <td>{run.total_score}</td>
                    <td>
                      {run.selected_platform_count}/{run.target_platform_count}
                    </td>
                    <td>{run.selected_card_count}</td>
                    <td>{run.promoted_canonical ? 'yes' : 'no'}</td>
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
        <h2>Latest package</h2>
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
        <h2>Package manifest facts</h2>
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
        <h2>Selected signal cards</h2>
        {selectedCards?.platforms ? (
          <div className="split-grid">
            {Object.entries(selectedCards.platforms).map(([platform, detail]) => (
              <article className="surface-card" key={platform}>
                <div className="surface-heading">
                  <h3>{platform}</h3>
                  <StatusBadge tone="good">{(detail.selected_card_ids || []).length} cards</StatusBadge>
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
        <h2>Latest batch</h2>
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
        <h2>Batch manifest facts</h2>
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
        <h2>Included run packages</h2>
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

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <h2>Canonical handoff set</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Artifact</th>
                <th>SHA</th>
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
                      <a href={item.public_path} download={item.filename}>
                        {item.filename}
                      </a>
                    ) : (
                      'Unavailable'
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

function App() {
  const { loading, fatalError, index, datasets, optionalErrors } = useDashboardData();
  const [activePage, setActivePage] = useState('overview');

  const pageDefinitions = useMemo(() => {
    if (!index?.navigation) return [];
    return PAGE_ORDER.map((id) => index.navigation.find((page) => page.id === id)).filter(Boolean);
  }, [index]);

  useEffect(() => {
    if (!pageDefinitions.length) return;
    if (!pageDefinitions.some((page) => page.id === activePage)) {
      setActivePage(pageDefinitions[0].id);
    }
  }, [activePage, pageDefinitions]);

  if (loading) {
    return (
      <div className="shell centered">
        <div className="loading-panel">
          <p className="eyebrow">Lane B review shell</p>
          <h1>Loading frozen dashboard contract…</h1>
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
  const summary = index.summary || {};
  const authorityEntries = Object.values(index.ui_contract?.design_authority || {});

  const renderPage = () => {
    switch (activePage) {
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
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Lane B static review</p>
          <h1>{index.app?.title || 'Strategy Dashboard'}</h1>
          <p className="sidebar-copy">{index.app?.description}</p>
        </div>

        <div className="pill-row">
          <StatusBadge tone="good">{index.app?.data_mode || 'static_json'}</StatusBadge>
          <StatusBadge tone="warn">{index.app?.handoff_mode || 'replit_ui_packet'}</StatusBadge>
          <StatusBadge tone="neutral">no backend</StatusBadge>
        </div>

        <nav className="nav-list" aria-label="Dashboard sections">
          {pageDefinitions.map((page) => (
            <button
              key={page.id}
              type="button"
              className={page.id === activePage ? 'nav-item active' : 'nav-item'}
              onClick={() => setActivePage(page.id)}
            >
              <span>{page.label}</span>
              <small>{page.subtitle}</small>
            </button>
          ))}
        </nav>

        <section className="sidebar-section">
          <p className="section-label">Design authority</p>
          <div className="authority-list">
            {authorityEntries.map((entry) => (
              <div className="authority-item" key={entry.source + entry.applies_to}>
                <strong>{entry.source}</strong>
                <small>{entry.applies_to}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="sidebar-meta">
          <p>
            <strong>Generated:</strong> {formatDate(index.generated_at)}
          </p>
          <p>
            <strong>Contract:</strong> {index.contract_version}
          </p>
          <p>
            <strong>Audience:</strong> {index.app?.audience || 'Unavailable'}
          </p>
        </div>
      </aside>

      <main className="content">
        <section className="status-strip">
          <div className="strip-card">
            <span>Promoted alias</span>
            <strong>{summary.top_level_alias_run_id || 'Unavailable'}</strong>
          </div>
          <div className="strip-card">
            <span>Latest success</span>
            <strong>{summary.latest_successful_run_id || 'Unavailable'}</strong>
          </div>
          <div className="strip-card">
            <span>Review recommendation</span>
            <strong>{summary.latest_review_recommended_run_id || 'Unavailable'}</strong>
          </div>
          <div className="strip-card">
            <span>Latest package</span>
            <strong>{summary.latest_package_run_id || 'Unavailable'}</strong>
          </div>
        </section>

        <header className="content-header">
          <div className="header-stack">
            <p className="eyebrow">Replit handoff shell</p>
            <h2>{activePageMeta?.label || 'Overview'}</h2>
            <p className="page-lede">{PAGE_LEADS[activePage]}</p>
          </div>
          <div className="header-side">
            <div className="header-badges">
              <StatusBadge tone="good">{index.status || 'PASS'}</StatusBadge>
              <StatusBadge tone="good">review bound</StatusBadge>
              {Object.keys(optionalErrors).length ? <StatusBadge tone="warn">Optional gaps</StatusBadge> : null}
            </div>
            <p className="header-note">Bundled JSON only. No live API. No raw repo-path reads.</p>
          </div>
        </header>

        {Object.keys(optionalErrors).length ? (
          <section className="panel warning-panel">
            <h2>Optional data unavailable</h2>
            <ul className="stack-list">
              {Object.entries(optionalErrors).map(([id, error]) => (
                <li key={id}>
                  <strong>{id}</strong>: {error}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {renderPage()}
      </main>
    </div>
  );
}

export default App;
