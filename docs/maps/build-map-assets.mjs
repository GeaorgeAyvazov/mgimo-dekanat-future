// Build local, inert map assets from publicly rendered MGIMO floor pages.
// Source scripts are parsed as AST literals only. They are never executed.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const inputArg = process.argv.indexOf('--input');
const evidenceDir = path.resolve(inputArg >= 0 ? process.argv[inputArg + 1] : path.dirname(fileURLToPath(import.meta.url)));
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDir = path.join(projectDir, 'public/maps');
const floorsDir = path.join(outputDir, 'floors');
const index = JSON.parse(await fs.readFile(path.join(evidenceDir, 'floor-index.json'), 'utf8'));
const pythonArg = process.argv.indexOf('--python');
let python = pythonArg >= 0 ? process.argv[pythonArg + 1] : process.env.MAP_PYTHON;
if (!python) {
  const bundled = path.resolve(path.dirname(process.execPath), '../../python/python.exe');
  try { await fs.access(bundled); python = bundled; } catch { python = process.platform === 'win32' ? 'python' : 'python3'; }
}

function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand))
    return (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1) * Number(node.operand.text);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p) || !p.name || !p.initializer)
      throw new Error('Non-literal field rejected.');
    return [p.name.text, literal(p.initializer)];
  }));
  throw new Error('Non-literal value rejected: ' + ts.SyntaxKind[node.kind]);
}

function readRooms(html) {
  if (html.includes('[Truncated]')) throw new Error('Captured scripts are truncated.');
  const found = {};
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  if (!scripts.length) throw new Error('No complete script blocks.');
  for (const script of scripts) {
    const source = ts.createSourceFile('map.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const visit = node => {
      if (ts.isVariableDeclaration(node) && ['Rooms', 'RoomsRewrite'].includes(node.name.getText(source)) && node.initializer && ts.isObjectLiteralExpression(node.initializer))
        found[node.name.getText(source)] = literal(node.initializer);
      if (ts.isBinaryExpression(node) && ['Rooms', 'RoomsRewrite'].includes(node.left.getText(source)) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isObjectLiteralExpression(node.right))
        found[node.left.getText(source)] = literal(node.right);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  if (!found.Rooms) throw new Error('Rooms object not found.');
  return Object.fromEntries(Object.entries(found.Rooms).map(([id, base]) => [id, { ...base, ...(found.RoomsRewrite?.[id] ?? {}) }]));
}

function plainName(input) {
  return String(input ?? '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, dec) => String.fromCodePoint(parseInt(hex ?? dec, hex ? 16 : 10)))
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

// Python's standard XML parser gives structural sanitization without a new app dependency.
const sanitizer = String.raw`
import json,sys,re,xml.etree.ElementTree as ET
p=json.load(sys.stdin);raw=p['svg']
if re.search(r'<!DOCTYPE|<!ENTITY',raw,re.I):raise ValueError('DTD/entities rejected')
ns='http://www.w3.org/2000/svg';ET.register_namespace('',ns);ET.register_namespace('xlink','http://www.w3.org/1999/xlink')
root=ET.fromstring(raw)
if root.tag!='{'+ns+'}svg':raise ValueError('Expected SVG root')
allowed={'svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','defs','clipPath','linearGradient','radialGradient','stop','use','title','desc','pattern','marker','mask','filter','feGaussianBlur','feOffset','feMerge','feMergeNode','feColorMatrix','feBlend','feComposite','feFlood','feComponentTransfer','feFuncA','feFuncR','feFuncG','feFuncB'}
props={'fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','opacity','display','visibility','clip-path','clip-rule','color','font-family','font-size','font-style','font-weight','font-stretch','text-anchor','text-align','letter-spacing','word-spacing','dominant-baseline','writing-mode','paint-order','overflow','stop-color','stop-opacity','vector-effect','filter','mask','marker-start','marker-mid','marker-end'}
def safe(value):
 if re.search(r'(?:javascript|vbscript|data|https?|file)\s*:|expression\s*\(|@import',value,re.I):return False
 return all(re.fullmatch(r'\s*[\x22\x27]?#[\w.:-]+[\x22\x27]?\s*',u) for u in re.findall(r'url\((.*?)\)',value,re.I))
def local(s):return s.rsplit('}',1)[-1]
def clean(el):
 for c in list(el):
  if local(c.tag) not in allowed or not c.tag.startswith('{'+ns+'}'):el.remove(c)
  else:clean(c)
 for a in list(el.attrib):
  name=local(a).lower();v=el.attrib[a]
  if name.startswith('on') or name in {'src','srcset'} or (name=='href' and not re.fullmatch(r'#[\w.:-]+',v)) or (name!='style' and not safe(v)):del el.attrib[a]
 style={}
 for item in el.attrib.get('style','').split(';'):
  if ':' not in item:continue
  key,value=item.split(':',1);key=key.strip().lower();value=value.strip()
  if key in props and safe(value):style[key]=value
 ident=el.attrib.get('id','');computed=p['styles'].get(ident,{})
 for source,target in [('fill','fill'),('stroke','stroke'),('fontSize','font-size')]:
  value=computed.get(source)
  if isinstance(value,str) and safe(value):style[target]=value
 if 'fontSize' in computed:style['font-family']='Arial, sans-serif'
 room=p['rooms'].get(ident)
 if room and room.get('type') in p['fills'] and ('fill' not in computed or not re.search(r'\bimatype\d+\b',el.attrib.get('class',''))):style['fill']=p['fills'][room['type']]
 if style:el.set('style',';'.join(k+':'+v for k,v in style.items()))
 elif 'style' in el.attrib:del el.attrib['style']
clean(root)
root.attrib.pop('id',None);root.attrib.pop('height',None);root.set('width','100%');root.set('height','100%')
vb=[float(x) for x in root.attrib.get('viewBox','').replace(',',' ').split()]
if len(vb)!=4 or vb[2]<=0 or vb[3]<=0:raise ValueError('Invalid viewBox')
ids=set();duplicates=[]
for e in root.iter():
 ident=e.attrib.get('id')
 if not ident:continue
 if ident in ids:
  if ident in p['rooms']:raise ValueError('Duplicate mapped room id: '+ident)
  del e.attrib['id'];duplicates.append(ident)
 else:ids.add(ident)
labels=0
for ident,r in p['rooms'].items():
 if ident not in ids or 'rn_'+ident in ids or r.get('type') in {'5','44','11'}:continue
 box=r.get('box')
 if not box:continue
 text=r['name'];size=max(10,min(vb[2]/65,56))
 if len(text)>16:continue
 label=ET.SubElement(root,'{'+ns+'}text',{'id':'rn_'+ident,'x':str(box['x']+box['width']/2),'y':str(box['y']+box['height']/2),'text-anchor':'middle','dominant-baseline':'central','font-size':str(size),'font-family':'Arial, sans-serif','fill':'#000','class':'room_number','pointer-events':'none'})
 label.text=text;labels+=1
out=ET.tostring(root,encoding='unicode')
json.dump({'svg':out,'viewBox':vb,'generatedLabels':labels,'ids':list(ids),'removedDuplicateIds':duplicates},sys.stdout,ensure_ascii=False)
`;

const fills = { '1':'#ff8080', '2':'#aaffcc', '3':'#aaeeff', '4':'#ccc', '44':'#ccc', '6':'#efa', '7':'#eee', '8':'#ff4', '9':'#5f5', '10':'#5f5' };
const floors = [], missing = [], warnings = [];
await fs.mkdir(floorsDir, { recursive: true });
for (const building of index) for (const floor of building.floors) {
  const key = building.id + floor.id;
  if (!/^[a-z][0-9]+$/.test(key)) throw new Error('Unexpected floor key: ' + key);
  const required = ['scripts.html', 'svg', 'geometry.json', 'styles.json'];
  const absent = [];
  for (const suffix of required) try { await fs.access(path.join(evidenceDir, `${key}.${suffix}`)); } catch { absent.push(suffix); }
  if (absent.length) { missing.push({ key, reason:'Missing capture files: ' + absent.join(', ') }); continue; }
  try {
    const [script, svg, geoText, styleText] = await Promise.all(required.map(suffix => fs.readFile(path.join(evidenceDir, `${key}.${suffix}`), 'utf8')));
    const allRooms = readRooms(script), geometry = JSON.parse(geoText), styles = JSON.parse(styleText);
    if (!Array.isArray(geometry) || !Array.isArray(styles)) throw new Error('Geometry/styles must be arrays.');
    const byBox = new Map(geometry.map(v => [v.id, v]));
    const rooms = Object.entries(allRooms).flatMap(([id, room]) => {
      const g = byBox.get(id);
      if (!g || ![g.x,g.y,g.width,g.height].every(Number.isFinite) || g.width<=0 || g.height<=0) {
        warnings.push({ key, id, reason:'No valid captured geometry; room omitted.' }); return [];
      }
      const type = String(room.type ?? '');
      if (!/^\d{1,2}$/.test(type)) throw new Error('Unknown room type: ' + type);
      const box = Object.fromEntries(['x','y','width','height'].map(k => [k, Math.round(g[k]*1000)/1000]));
      return [{ id, name:plainName(room.name) || id, type, box }];
    });
    if (!rooms.length) throw new Error('No mapped rooms with valid geometry.');
    const sanitized = spawnSync(python, ['-X', 'utf8', '-c', sanitizer], { input:JSON.stringify({svg, styles:Object.fromEntries(styles.filter(s=>s.id).map(s=>[s.id,s])), rooms:Object.fromEntries(rooms.map(r=>[r.id,r])), fills}), encoding:'utf8', maxBuffer:12*1024*1024 });
    if (sanitized.error) throw sanitized.error;
    if (sanitized.status!==0) throw new Error('SVG sanitizer failed: '+sanitized.stderr.slice(-500));
    const clean = JSON.parse(sanitized.stdout), ids = new Set(clean.ids);
    for (const id of clean.removedDuplicateIds) warnings.push({key,id,reason:'Duplicate decorative SVG id removed from later node; geometry preserved.'});
    const verifiedRooms = rooms.filter(r => {
      if (ids.has(r.id)) return true;
      warnings.push({key,id:r.id,reason:'Metadata has no matching SVG node; room omitted.'}); return false;
    });
    await fs.writeFile(path.join(floorsDir, key+'.svg'),clean.svg+'\n');
    floors.push({ key,building:building.id,floor:floor.id,name:`${building.name} · ${floor.name}`,svg:`/maps/floors/${key}.svg`,viewBox:clean.viewBox,rooms:verifiedRooms });
    console.log(`${key}: ${verifiedRooms.length} rooms, ${clean.generatedLabels} labels generated, ${Buffer.byteLength(clean.svg)} SVG bytes`);
  } catch (error) { missing.push({key,reason:error.message}); }
}
const manifest = {version:1,campus:'moscow',source:'https://mgimo.ru/territory/map/',source_capture_date:'2026-11-06',built_at:new Date().toISOString(),buildings:index,floors,missing};
await fs.writeFile(path.join(outputDir,'indoor.json.tmp'),JSON.stringify(manifest,null,2)+'\n');
await fs.rename(path.join(outputDir,'indoor.json.tmp'),path.join(outputDir,'indoor.json'));
const report = {source_capture_date:manifest.source_capture_date,built:floors.map(f=>({key:f.key,rooms:f.rooms.length})),missing,warnings};
await fs.writeFile(path.join(evidenceDir,'build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({built:floors.length,rooms:floors.reduce((sum,f)=>sum+f.rooms.length,0),missing:missing.length,warnings:warnings.length,report:path.join(evidenceDir,'build-report.json')},null,2));
for (const failure of missing) console.log(`SKIP ${failure.key}: ${failure.reason}`);
if (process.argv.includes('--strict') && missing.length) process.exitCode=1;
