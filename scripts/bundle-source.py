"""Build the distributable archive from reviewed source and demonstration material."""
import argparse
import json
import os
import stat
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "public/submission/source.zip"
ROOT_FILES = (
    ".gitattributes", ".gitignore", ".npmrc", "README.md",
    "cloudflare-env.d.ts", "components.json", "drizzle.config.ts",
    "eslint.config.mjs", "next.config.ts", "package-lock.json", "package.json",
    "postcss.config.mjs", "tsconfig.json", "vite.config.ts",
)
# Only distribution inputs belong here. Local D1 state, build output, user
# uploads, research captures and old delivery bundles are deliberately outside
# these roots. Do not recursively copy public/ or the entire checkout.
SOURCE_FOLDERS = {
    "app": {".ts", ".tsx", ".css", ".svg"},
    "components": {".ts", ".tsx", ".css"},
    "db": {".ts"},
    "drizzle": {".sql", ".json"},
    "hooks": {".ts", ".tsx"},
    "lib": {".ts", ".mts", ".json"},
    "licenses": {".txt", ".md"},
    "scripts": {".ts", ".mjs", ".py", ".sh", ".license"},
    "vendor": {".css", ".md"},
    "worker": {".ts"},
    "deploy": {".json", ".mjs", ".md", ".service", ".example"},
    "public/fonts": {".woff2"},
    "public/maps": {".svg", ".json"},
}
DOCUMENTS = (
    "docs/ARCHITECTURE.md", "docs/JURY.md", "docs/PROCESS.md",
    "docs/api-checks.json", "docs/mobile-checks.json",
    "docs/maps/README.md", "docs/maps/SOURCES.md", "docs/maps/validation-report.json",
    "docs/maps/build-map-assets.mjs", "docs/maps/extract-floor-metadata.mjs",
    "docs/maps/build-report.json", "docs/maps/floor-index.json",
    "docs/product/PLAN.md", "docs/product/EXECUTION.md", "docs/product/ITERATION-4.md",
    "docs/product/MAP-RD.md", "docs/product/RD-REVIEW.md", "docs/product/UX-REVIEW.md",
    "docs/product/api-checks.json", "docs/product/directory-checks.json",
    "docs/product/map-checks.json", "docs/product/room-calendar-checks.json",
    "docs/research/01-observations.md", "docs/research/02-benchmarks.md",
    "docs/research/03-service-concept.md", "docs/research/04-research-process.md",
    "docs/research/05-hse-workflow-and-design.md", "docs/research/evidence/hse-ui-reference.json",
    "public/favicon.svg", "public/submission/process-report.pdf", "public/submission/captain-comment.txt",
)
DEMO_SCREENS = """
01-today-mobile-360.png 02-paper-form-mobile-360.png 03-ready-mobile-360.png
04-today-desktop.png 05-grades-desktop.png 06-schedule-week-desktop.png
07-catalog-desktop.png 08-schedule-mobile-360.png 09-grades-mobile-360.png
10-catalog-mobile-360.png 10-requests-mobile-360.png 11-profile-mobile-360.png
12-staff-processing-desktop.png 13-student-sees-completion.png 14-foreign-case-denied.png
15-center-desktop.png 16-login-service-center.png 17-center-mobile-360.png
18-question-request.png 19-wallet-mobile-360.png 20-cancel-confirm-mobile.png
21-request-notifications-mobile.png 22-reply-conflict-mobile.png 23-request-notifications-desktop.png
24-sidebar-expanded.png 25-directory-search.png 26-indoor-map-mobile.png
27-directory-mobile.png 28-employee-mobile.png 29-indoor-map-desktop.png
30-room-calendar-desktop.png 31-room-calendar-mobile.png 32-signed-document-mobile.jpg
33-office-report-mobile.jpg 34-schedule-mobile.png 35-services-mobile.png
36-notifications-popover-mobile.png 37-ruz.jpg 38-study-desktop.jpg 39-room-interval-mobile.jpg
""".split()


def is_link(path):
    attributes = getattr(path.lstat(), "st_file_attributes", 0)
    return path.is_symlink() or bool(attributes & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0))


def walk_source(relative_root, suffixes):
    base = ROOT / relative_root
    if is_link(base):
        raise ValueError(f"Unexpected link in source root: {base}")
    for current, dirs, files in os.walk(base, followlinks=False):
        folder = Path(current)
        dirs[:] = sorted(name for name in dirs if not name.startswith(".")
                         and name not in {"__pycache__", "node_modules"}
                         and not is_link(folder / name))
        for name in sorted(files):
            path = folder / name
            if not name.startswith(".") and path.suffix.lower() in suffixes and not is_link(path):
                yield path.relative_to(ROOT).as_posix()


def write_archive(output):
    files = set(ROOT_FILES) | set(DOCUMENTS)
    files.update(f"docs/screenshots/{name}" for name in DEMO_SCREENS)
    for directory, suffixes in SOURCE_FOLDERS.items():
        files.update(walk_source(directory, suffixes))
    # The local build reads these binding names. The owner's Sites project ID
    # is unnecessary in an independently run copy.
    config = json.loads((ROOT / ".openai/hosting.json").read_text(encoding="utf-8-sig"))
    local_config = {key: config.get(key) for key in ("d1", "r2")}
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix="portal-source-", suffix=".tmp", dir=output.parent, delete=False) as tmp:
        staged = Path(tmp.name)
    try:
        with ZipFile(staged, "w", ZIP_DEFLATED, strict_timestamps=False) as bundle:
            for name in sorted(files):
                path = ROOT / name
                if not path.is_file() or is_link(path) or path.resolve() != path:
                    raise ValueError(f"Missing or redirected distribution file: {name}")
                bundle.write(path, "student-portal/" + name)
            bundle.writestr("student-portal/.openai/hosting.json", json.dumps(local_config, indent=2) + "\n")
        with ZipFile(staged) as bundle:
            bad_entry = bundle.testzip()
            if bad_entry:
                raise ValueError(f"Archive validation failed: {bad_entry}")
        os.replace(staged, output)
    finally:
        staged.unlink(missing_ok=True)
    print(f"{output} ({len(files) + 1} files, {output.stat().st_size} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    write_archive(parser.parse_args().output.resolve())
