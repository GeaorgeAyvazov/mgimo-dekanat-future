from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
root=Path(__file__).resolve().parents[1]
target=root/'public/submission'
target.mkdir(parents=True,exist_ok=True)
shutil.copyfile(root/'output/pdf/process-report.pdf',target/'process-report.pdf')
skip_dirs={'.git','node_modules','dist','.next','.vinext','.wrangler','.sites-runtime','outputs','tmp','__pycache__','.codex','.agents'}
archive=target/'source.zip'
with ZipFile(archive,'w',ZIP_DEFLATED,strict_timestamps=False) as z:
 for path in root.rglob('*'):
  relative=path.relative_to(root)
  if not path.is_file() or any(p in skip_dirs for p in relative.parts):continue
  if path==archive or path.name.startswith(('.env','.dev.vars')) or path.suffix in {'.pem','.tsbuildinfo'}:continue
  z.write(path,Path('student-portal')/relative)
print(f'Source: {archive} ({archive.stat().st_size} bytes)')
