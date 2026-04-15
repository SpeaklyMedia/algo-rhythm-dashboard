#!/usr/bin/env python3
import argparse
import hashlib
import json
import tempfile
import zipfile
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ZIP = REPO_ROOT / "raw_downloads" / "SOCIAL_UTILITY__REPLIT_UI_HANDOFF__20260415__R24.zip"
DEFAULT_RECEIPT = REPO_ROOT / "05_RECEIPTS" / "REPLIT_UI_HANDOFF_REPORT__20260415__R24.json"


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_path(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def choose_compression(path):
    return zipfile.ZIP_STORED if path.suffix == ".zip" else zipfile.ZIP_DEFLATED


def should_include(path):
    rel = path.relative_to(APP_ROOT)
    if "__pycache__" in rel.parts or path.suffix == ".pyc":
        return False
    if rel.parts and rel.parts[0] in {"node_modules", "dist"}:
        return False
    return True


def build_zip(zip_path, files):
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=str(zip_path.parent), prefix=f".tmp_{zip_path.stem}_") as temp_dir:
        temp_zip = Path(temp_dir) / zip_path.name
        with zipfile.ZipFile(temp_zip, "w") as zf:
            for path in sorted(files):
                arcname = str(path.relative_to(APP_ROOT))
                zf.write(path, arcname=arcname, compress_type=choose_compression(path))
        temp_zip.replace(zip_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip-out", type=Path, default=DEFAULT_ZIP)
    parser.add_argument("--receipt-out", type=Path, default=DEFAULT_RECEIPT)
    args = parser.parse_args()

    required = [
        APP_ROOT / "package.json",
        APP_ROOT / "vite.config.js",
        APP_ROOT / ".replit",
        APP_ROOT / "replit.nix",
        APP_ROOT / "replit.md",
        APP_ROOT / "README.md",
        APP_ROOT / "public" / "data" / "dashboard_index.json",
        APP_ROOT / "handoff" / "REPLIT_UI_IMPLEMENTATION_BRIEF.md",
        APP_ROOT / "handoff" / "REPLIT_UI_SOURCE_AUTHORITY.md",
        APP_ROOT / "handoff" / "REPLIT_UI_DESIGN_TOKENS.json",
        APP_ROOT / "handoff" / "REPLIT_UI_LAYOUT_MAP.json",
        APP_ROOT / "handoff" / "REPLIT_UI_COMPONENT_SPEC.md",
        APP_ROOT / "handoff" / "REPLIT_UI_WIRING_SPEC.md",
        APP_ROOT / "handoff" / "REPLIT_UI_PROMPT__REFINED.md",
        APP_ROOT / "handoff" / "REPLIT_UI_QA_CHECKLIST.md",
    ]
    missing = [str(path.relative_to(APP_ROOT)) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(f"missing_required_handoff_files:{','.join(missing)}")

    files = [path for path in APP_ROOT.rglob("*") if path.is_file() and should_include(path)]
    build_zip(args.zip_out, files)

    receipt = OrderedDict(
        [
            ("status", "PASS"),
            ("generated_at", iso_now()),
            ("command", "python3 01_WORKINGSET/strategy_dashboard_replit/tools/package_replit_handoff.py"),
            ("zip_path", str(args.zip_out.relative_to(REPO_ROOT))),
            ("zip_sha256", sha256_path(args.zip_out)),
            ("zip_size_bytes", args.zip_out.stat().st_size),
            ("included_file_count", len(files)),
            ("required_files", [str(path.relative_to(APP_ROOT)) for path in required]),
            (
                "handoff_docs",
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
        ]
    )
    write_json(args.receipt_out, receipt)


if __name__ == "__main__":
    main()
