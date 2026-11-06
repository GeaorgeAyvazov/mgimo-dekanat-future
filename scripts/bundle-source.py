from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
root=Path(__file__).resolve().parents[1]
target=root/'public/submission'
target.mkdir(parents=True,exist_ok=True)
shutil.copyfile(root/'output/pdf/process-report.pdf',target/'process-report.pdf')
product=root/'docs/product'
if product.exists():
 plan=(product/'PLAN.md').read_text(encoding='utf-8').replace('(EXECUTION.md)','(product-execution.md)').replace('(../research)','(source.zip)').replace('(../PROCESS.md)','(process-report.pdf)')
 execution=(product/'EXECUTION.md').read_text(encoding='utf-8').replace('(PLAN.md)','(product-plan.md)').replace('(api-checks.json)','(product-api-checks.json)')
 screenshots={'20-cancel-confirm-mobile.png':'product-cancel.png','21-request-notifications-mobile.png':'product-notifications.png','22-reply-conflict-mobile.png':'product-reply-conflict.png'}
 for name,published in screenshots.items():
  execution=execution.replace(f'(../screenshots/{name})',f'({published})')
  shutil.copyfile(root/'docs/screenshots'/name,target/published)
 (target/'product-plan.md').write_text(plan,encoding='utf-8')
 (target/'product-execution.md').write_text(execution,encoding='utf-8')
 shutil.copyfile(product/'api-checks.json',target/'product-api-checks.json')
skip_dirs={'.git','node_modules','dist','.next','.vinext','.wrangler','.sites-runtime','outputs','tmp','__pycache__','.codex','.agents'}
archive=target/'source.zip'
with ZipFile(archive,'w',ZIP_DEFLATED,strict_timestamps=False) as z:
 for path in root.rglob('*'):
  relative=path.relative_to(root)
  if not path.is_file() or any(p in skip_dirs for p in relative.parts):continue
  if path==archive or path.name.startswith(('.env','.dev.vars')) or path.suffix in {'.pem','.tsbuildinfo'}:continue
  z.write(path,Path('student-portal')/relative)
print(f'Source: {archive} ({archive.stat().st_size} bytes)')
