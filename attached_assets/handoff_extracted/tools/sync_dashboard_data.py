#!/usr/bin/env python3
import argparse
import hashlib
import json
import re
import shutil
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = APP_ROOT / "public" / "data"
DOWNLOADS_DIR = APP_ROOT / "public" / "downloads"
INDEX_PATH = REPO_ROOT / "04_OUTPUTS" / "STRATEGY_DASHBOARD_INDEX.json"
BUNDLED_DOWNLOAD_IDS = {
    "canonical_pointer",
    "canonical_sha",
    "latest_package_zip",
    "latest_batch_zip",
}
CYCLIC_ARCHIVE_IDS = {
    "canonical_ssot",
    "non_bundled_transport",
    "project_travel",
    "full_travel",
}

DATASETS = OrderedDict(
    [
        ("latest_run", ("04_OUTPUTS/STRATEGY_RUNS/LATEST.json", True)),
        ("latest_review", ("04_OUTPUTS/STRATEGY_RUNS/LATEST_REVIEW.json", True)),
        ("latest_package", ("04_OUTPUTS/STRATEGY_PACKAGES/LATEST_PACKAGE.json", True)),
        ("latest_batch", ("04_OUTPUTS/STRATEGY_BATCHES/LATEST_BATCH.json", True)),
        ("content_object", ("04_OUTPUTS/CONTENT_OBJECT.json", True)),
        ("trend_shortlist", ("04_OUTPUTS/TREND_SHORTLIST.json", True)),
        ("platform_signal_selection", ("04_OUTPUTS/PLATFORM_SIGNAL_SELECTION.json", True)),
        ("viability_scorecard", ("04_OUTPUTS/VIABILITY_SCORECARD.json", True)),
        ("four_tier_adaptations", ("04_OUTPUTS/FOUR_TIER_ADAPTATIONS.json", True)),
        ("experiment_plan", ("04_OUTPUTS/EXPERIMENT_PLAN.json", True)),
        ("campaign_ledger_seed", ("04_OUTPUTS/CAMPAIGN_LEDGER.seed.json", False)),
    ]
)

NAVIGATION = [
    ("overview", "Overview", "Promoted, latest, review, package, batch"),
    ("strategy", "Strategy", "Content, trends, scorecard, platform decisions"),
    ("review", "Review", "Recommendation, ranked runs, exclusions"),
    ("package", "Package", "Latest package facts and selected cards"),
    ("batch", "Batch", "Reviewed cohort and included package modes"),
    ("handoff", "Handoff", "Canonical downloads and contract metadata"),
]

PAGE_DATASETS = OrderedDict(
    [
        ("overview", ["latest_run", "latest_review", "latest_package", "latest_batch"]),
        (
            "strategy",
            [
                "content_object",
                "trend_shortlist",
                "platform_signal_selection",
                "viability_scorecard",
                "four_tier_adaptations",
                "experiment_plan",
                "campaign_ledger_seed",
            ],
        ),
        ("review", ["promotion_recommendation", "run_comparison_scorecard", "run_review_index"]),
        ("package", ["latest_package", "package_manifest", "selected_signal_cards"]),
        ("batch", ["latest_batch", "batch_manifest", "run_package_index"]),
        ("handoff", []),
    ]
)


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def sha256_path(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relpath(path):
    try:
      return str(path.relative_to(REPO_ROOT))
    except ValueError:
      return str(path)


def copy_file(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def clear_directory(path):
    path.mkdir(parents=True, exist_ok=True)
    for child in sorted(path.iterdir()):
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def read_current_pointer():
    pointer_path = REPO_ROOT / "transports" / "project_folder_travel" / "CANONICAL_POINTER__SSOT_LATEST.txt"
    sha_path = REPO_ROOT / "transports" / "project_folder_travel" / "CANONICAL_SHA256__SSOT_LATEST.txt"
    ssot_name = pointer_path.read_text(encoding="utf-8").strip()
    ssot_sha = sha_path.read_text(encoding="utf-8").strip()
    match = re.search(r"__(R\d+)\.zip$", ssot_name)
    if not match:
        raise ValueError("unable_to_parse_current_revision")
    return ssot_name, ssot_sha, match.group(1)


def find_revision_file(prefix, revision):
    matches = sorted((REPO_ROOT / "raw_downloads").glob(f"{prefix}*__{revision}*.zip"))
    if not matches:
        raise FileNotFoundError(f"missing_revision_file:{prefix}:{revision}")
    return matches[-1]


def current_artifacts(revision, latest_package, latest_batch):
    project_pointer = REPO_ROOT / "transports" / "project_folder_travel" / "CANONICAL_POINTER__SSOT_LATEST.txt"
    project_sha = REPO_ROOT / "transports" / "project_folder_travel" / "CANONICAL_SHA256__SSOT_LATEST.txt"
    ssot_zip = REPO_ROOT / "raw_downloads" / project_pointer.read_text(encoding="utf-8").strip()
    non_bundled_zip = find_revision_file("SOCIAL_UTILITY__NON_BUNDLED_ARTIFACTS__", revision)
    project_travel_zip = find_revision_file("SOCIAL_UTILITY__PROJECT_FOLDER_TRAVEL__", revision)
    full_travel_zip = find_revision_file("SOCIAL_UTILITY__FULL_PROJECT_TRAVEL__", revision)
    latest_package_zip = REPO_ROOT / latest_package["package_zip_path"]
    latest_batch_zip = REPO_ROOT / latest_batch["batch_zip_path"]

    return OrderedDict(
        [
            ("canonical_pointer", project_pointer),
            ("canonical_sha", project_sha),
            ("canonical_ssot", ssot_zip),
            ("non_bundled_transport", non_bundled_zip),
            ("project_travel", project_travel_zip),
            ("full_travel", full_travel_zip),
            ("latest_package_zip", latest_package_zip),
            ("latest_batch_zip", latest_batch_zip),
        ]
    )


def derive_dynamic_sources(latest_review, latest_package, latest_batch):
    package_manifest_path = REPO_ROOT / latest_package["package_manifest_path"]
    batch_manifest_path = REPO_ROOT / latest_batch["batch_manifest_path"]
    package_manifest = load_json(package_manifest_path)
    batch_manifest = load_json(batch_manifest_path)
    review_path = REPO_ROOT / latest_review["promotion_recommendation_path"]

    dynamic = OrderedDict(
        [
            ("promotion_recommendation", (review_path, True)),
            ("run_comparison_scorecard", (review_path.parent / "RUN_COMPARISON_SCORECARD.json", True)),
            ("run_review_index", (review_path.parent / "RUN_REVIEW_INDEX.json", True)),
            ("package_manifest", (package_manifest_path, True)),
            ("selected_signal_cards", (package_manifest_path.parent / "SELECTED_SIGNAL_CARDS.json", False)),
            ("batch_manifest", (batch_manifest_path, True)),
            ("run_package_index", (batch_manifest_path.parent / "RUN_PACKAGE_INDEX.json", False)),
        ]
    )
    return dynamic


def load_run_manifests():
    run_root = REPO_ROOT / "04_OUTPUTS" / "STRATEGY_RUNS"
    manifests = OrderedDict()
    for manifest_path in sorted(run_root.glob("*/RUN_MANIFEST.json")):
        manifest = load_json(manifest_path)
        manifests[manifest["run_id"]] = manifest
    return manifests


def top_level_alias_candidate_ids(run_manifests):
    top_level_files = {
        "CONTENT_OBJECT.json": sha256_path(REPO_ROOT / "04_OUTPUTS" / "CONTENT_OBJECT.json"),
        "TREND_SHORTLIST.json": sha256_path(REPO_ROOT / "04_OUTPUTS" / "TREND_SHORTLIST.json"),
        "PLATFORM_SIGNAL_SELECTION.json": sha256_path(REPO_ROOT / "04_OUTPUTS" / "PLATFORM_SIGNAL_SELECTION.json"),
        "VIABILITY_SCORECARD.json": sha256_path(REPO_ROOT / "04_OUTPUTS" / "VIABILITY_SCORECARD.json"),
        "FOUR_TIER_ADAPTATIONS.json": sha256_path(REPO_ROOT / "04_OUTPUTS" / "FOUR_TIER_ADAPTATIONS.json"),
        "EXPERIMENT_PLAN.json": sha256_path(REPO_ROOT / "04_OUTPUTS" / "EXPERIMENT_PLAN.json"),
        "CAMPAIGN_LEDGER.seed.json": sha256_path(REPO_ROOT / "04_OUTPUTS" / "CAMPAIGN_LEDGER.seed.json"),
    }

    candidates = []
    for run_id, manifest in run_manifests.items():
        outputs = manifest.get("outputs", {})
        if all(outputs.get(name, {}).get("sha256") == expected for name, expected in top_level_files.items()):
            candidates.append(run_id)
    return top_level_files, candidates


def build_index_payload(dataset_entries, latest_run, latest_review, latest_package, latest_batch, revision):
    run_manifests = load_run_manifests()
    top_level_hashes, candidates = top_level_alias_candidate_ids(run_manifests)

    alias_run_id = None
    preferred = [latest_package.get("run_id"), latest_review.get("recommended_run_id"), latest_run.get("latest_successful_run_id")]
    for run_id in preferred:
        if run_id and run_id in candidates:
            alias_run_id = run_id
            break
    if alias_run_id is None and candidates:
        alias_run_id = candidates[0]

    warnings = []
    if len(candidates) > 1:
        warnings.append(
            "Top-level alias outputs match multiple stamped runs; latest package run is treated as the canonical alias source."
        )
    if latest_run.get("latest_successful_run_id") not in candidates:
        warnings.append("Latest successful run differs from the current top-level alias source run.")
    if latest_review.get("recommended_run_id") != latest_package.get("run_id"):
        warnings.append("Latest review recommendation and latest package run diverge.")

    downloads = []
    for download_id, path in current_artifacts(revision, latest_package, latest_batch).items():
        public_path = None
        if download_id in BUNDLED_DOWNLOAD_IDS:
            destination = DOWNLOADS_DIR / path.name
            copy_file(path, destination)
            public_path = f"/downloads/{path.name}"
        downloads.append(
            OrderedDict(
                [
                    ("id", download_id),
                    ("label", path.name.replace("__", " ").replace(".zip", "").replace(".txt", "")),
                    ("filename", path.name),
                    ("public_path", public_path),
                    ("bundled", public_path is not None),
                    ("source_path", relpath(path)),
                    ("sha256", None if download_id in CYCLIC_ARCHIVE_IDS else sha256_path(path)),
                    ("size_bytes", None if download_id in CYCLIC_ARCHIVE_IDS else path.stat().st_size),
                    (
                        "hash_note",
                        "See bundled selector files or external export receipts for canonical archive hashes."
                        if download_id in CYCLIC_ARCHIVE_IDS
                        else None
                    ),
                ]
            )
        )

    return OrderedDict(
        [
            ("status", "PASS"),
            ("generated_at", iso_now()),
            ("contract_version", "r24-replit-ui-v1"),
            (
                "app",
                OrderedDict(
                    [
                        ("name", "strategy_dashboard_replit"),
                        ("title", "Lane B Strategy Review Dashboard"),
                        (
                            "description",
                            "Static seeded dashboard for reviewing the promoted run, latest successful run, review, package, batch, and handoff surfaces.",
                        ),
                        ("data_mode", "static_json"),
                        ("target_runtime", "React + Vite"),
                        ("audience", "internal_operator_strategy_reviewer"),
                        ("handoff_mode", "replit_ui_packet"),
                    ]
                ),
            ),
            (
                "summary",
                OrderedDict(
                    [
                        ("top_level_alias_run_id", alias_run_id),
                        ("top_level_alias_candidate_ids", candidates),
                        ("latest_successful_run_id", latest_run.get("latest_successful_run_id")),
                        ("latest_review_recommended_run_id", latest_review.get("recommended_run_id")),
                        ("latest_package_run_id", latest_package.get("run_id")),
                        ("latest_batch_review_id", latest_batch.get("review_id")),
                        ("latest_batch_run_ids", latest_batch.get("included_run_ids", [])),
                    ]
                ),
            ),
            ("warnings", warnings),
            (
                "navigation",
                [
                    OrderedDict(
                        [
                            ("id", page_id),
                            ("label", label),
                            ("subtitle", subtitle),
                        ]
                    )
                    for page_id, label, subtitle in NAVIGATION
                ],
            ),
            (
                "ui_contract",
                OrderedDict(
                    [
                        (
                            "design_authority",
                            OrderedDict(
                                [
                                    (
                                        "shell_navigation",
                                        OrderedDict(
                                            [
                                                ("source", "Modal-Nodal"),
                                                ("applies_to", "dark-neutral shell, top status strip, pill navigation tone"),
                                                ("notes", "Use restrained cyan signal color and low-glare premium surfaces."),
                                            ]
                                        ),
                                    ),
                                    (
                                        "lane_hierarchy",
                                        OrderedDict(
                                            [
                                                ("source", "ThetaFrame"),
                                                ("applies_to", "page hierarchy, hero-summary-first layout, status semantics"),
                                                ("notes", "Keep the lane structure explicit before secondary detail panels."),
                                            ]
                                        ),
                                    ),
                                    (
                                        "function_modules",
                                        OrderedDict(
                                            [
                                                ("source", "Yuki"),
                                                ("applies_to", "roadmap cards, selectable function groups, modular canvases"),
                                                ("notes", "Reuse layout discipline, not the anime-neon palette."),
                                            ]
                                        ),
                                    ),
                                    (
                                        "operator_tone",
                                        OrderedDict(
                                            [
                                                ("source", "Flipper local scaffold"),
                                                ("applies_to", "local-first wording, blunt controls, fail-closed behavior"),
                                                ("notes", "Do not treat Flipper as the visual brand system."),
                                            ]
                                        ),
                                    ),
                                ]
                            ),
                        ),
                        (
                            "pages",
                            [
                                OrderedDict(
                                    [
                                        ("id", page_id),
                                        ("label", label),
                                        ("subtitle", subtitle),
                                        ("required_dataset_ids", PAGE_DATASETS[page_id]),
                                    ]
                                )
                                for page_id, label, subtitle in NAVIGATION
                            ],
                        ),
                        (
                            "required_state_distinctions",
                            [
                                "promoted_canonical",
                                "latest_successful_run",
                                "review_recommended_run",
                                "latest_package",
                                "latest_batch",
                            ],
                        ),
                        (
                            "missing_data_behavior",
                            OrderedDict(
                                [
                                    ("required", "block_page_with_error_panel"),
                                    ("optional", "render_unavailable_state"),
                                ]
                            ),
                        ),
                        (
                            "data_refresh",
                            OrderedDict(
                                [
                                    (
                                        "command",
                                        "python3 01_WORKINGSET/strategy_dashboard_replit/tools/sync_dashboard_data.py",
                                    ),
                                    ("mode", "static_bundle_only"),
                                ]
                            ),
                        ),
                        (
                            "download_policy",
                            OrderedDict(
                                [
                                    ("source", "public/downloads only"),
                                    ("bundled_archives", ["latest_package_zip", "latest_batch_zip", "canonical_pointer", "canonical_sha"]),
                                    ("non_bundled_archives", ["canonical_ssot", "non_bundled_transport", "project_travel", "full_travel"]),
                                ]
                            ),
                        ),
                    ]
                ),
            ),
            (
                "handoff_packet",
                OrderedDict(
                    [
                        ("artifact_name", "SOCIAL_UTILITY__REPLIT_UI_HANDOFF__20260415__R24.zip"),
                        ("runtime_files", [".replit", "replit.nix", "replit.md", "README.md"]),
                        (
                            "brief_files",
                            [
                                "handoff/REPLIT_UI_IMPLEMENTATION_BRIEF.md",
                                "handoff/REPLIT_UI_SOURCE_AUTHORITY.md",
                                "handoff/REPLIT_UI_DESIGN_TOKENS.json",
                                "handoff/REPLIT_UI_LAYOUT_MAP.json",
                                "handoff/REPLIT_UI_COMPONENT_SPEC.md",
                                "handoff/REPLIT_UI_WIRING_SPEC.md",
                                "handoff/REPLIT_UI_PROMPT__REFINED.md",
                                "handoff/REPLIT_UI_QA_CHECKLIST.md",
                            ],
                        ),
                        ("delivery_mode", "self-contained_replit_import_packet"),
                    ]
                ),
            ),
            ("datasets", dataset_entries),
            ("downloads", downloads),
            ("top_level_alias_hashes", top_level_hashes),
        ]
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--receipt-out",
        type=Path,
        default=REPO_ROOT / "05_RECEIPTS" / "STRATEGY_DASHBOARD_SYNC_REPORT__20260415__R24.json",
    )
    args = parser.parse_args()

    clear_directory(DATA_DIR)
    clear_directory(DOWNLOADS_DIR)

    latest_run = load_json(REPO_ROOT / DATASETS["latest_run"][0])
    latest_review = load_json(REPO_ROOT / DATASETS["latest_review"][0])
    latest_package = load_json(REPO_ROOT / DATASETS["latest_package"][0])
    latest_batch = load_json(REPO_ROOT / DATASETS["latest_batch"][0])
    _, _, revision = read_current_pointer()

    dataset_entries = OrderedDict()
    copied_paths = OrderedDict()

    dynamic_sources = derive_dynamic_sources(latest_review, latest_package, latest_batch)
    combined_sources = OrderedDict(DATASETS)
    combined_sources.update(
        OrderedDict((key, (relpath(path), required)) for key, (path, required) in dynamic_sources.items())
    )

    for dataset_id, (relative_source, required) in combined_sources.items():
        source_path = REPO_ROOT / relative_source
        destination_name = f"{dataset_id}.json"
        destination_path = DATA_DIR / destination_name
        copy_file(source_path, destination_path)
        dataset_entries[dataset_id] = OrderedDict(
            [
                ("public_path", f"/data/{destination_name}"),
                ("source_path", relpath(source_path)),
                ("required", required),
                ("sha256", sha256_path(source_path)),
            ]
        )
        copied_paths[dataset_id] = relpath(destination_path)

    index_payload = build_index_payload(dataset_entries, latest_run, latest_review, latest_package, latest_batch, revision)
    write_json(INDEX_PATH, index_payload)
    write_json(DATA_DIR / "dashboard_index.json", index_payload)

    receipt = OrderedDict(
        [
            ("status", "PASS"),
            ("generated_at", iso_now()),
            ("command", "python3 01_WORKINGSET/strategy_dashboard_replit/tools/sync_dashboard_data.py"),
            ("dashboard_index_path", relpath(INDEX_PATH)),
            ("dashboard_index_sha256", sha256_path(INDEX_PATH)),
            ("public_data_dir", relpath(DATA_DIR)),
            ("public_downloads_dir", relpath(DOWNLOADS_DIR)),
            ("dataset_count", len(dataset_entries)),
            ("download_count", len(index_payload["downloads"])),
            ("warnings", index_payload["warnings"]),
            ("datasets", dataset_entries),
        ]
    )
    write_json(args.receipt_out, receipt)


if __name__ == "__main__":
    main()
