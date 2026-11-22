"""Create the Linux runtime tarball from a completed portable build."""
import hashlib
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / "output" / "ubuntu"
out.mkdir(exist_ok=True, parents=True)
archive = out / "dekanat-ubuntu.tar.gz"
files = {p.name: p for p in (root / "deploy").iterdir() if p.is_file()}
for part in ("dist/server", "dist/client", "drizzle"):
    for p in (root / part).rglob("*"):
        if not p.is_file() or p.suffix == ".map" or p.is_symlink():
            continue
        name = p.relative_to(root).as_posix()
        if "/submission/" in name or "/.vite/" in name or "/meta/" in name:
            continue
        files[name] = p
if "dist/server/index.js" not in files or "package-lock.json" not in files:
    raise SystemExit("Build the project and lock runtime dependencies first")
with tarfile.open(archive, "w:gz") as bundle:
    for name, source in sorted(files.items()):
        bundle.add(source, arcname="dekanat/" + name, recursive=False)
with tarfile.open(archive) as bundle:
    assert len(bundle.getmembers()) == len(files)
(out / "SHA256SUMS").write_bytes((hashlib.sha256(archive.read_bytes()).hexdigest() + "  " + archive.name + "\n").encode())
print(archive, archive.stat().st_size)
