// Parse public page data as literals. Never execute the source page's scripts.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';

const file = process.argv[2];
if (!file) throw new Error('Pass one saved rendered-floor HTML path.');
const html = await fs.readFile(file, 'utf8');
const literal = (node) => {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand))
    return (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1) * Number(node.operand.text);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p) || !p.name || !p.initializer)
      throw new Error('Non-literal object field rejected.');
    return [p.name.text, literal(p.initializer)];
  }));
  throw new Error('Non-literal value rejected: ' + ts.SyntaxKind[node.kind]);
};
const objects = {};
for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  const source = ts.createSourceFile('public-map.js', script[1], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ['Rooms','RoomsRewrite'].includes(node.name.getText(source)) && node.initializer && ts.isObjectLiteralExpression(node.initializer))
      objects[node.name.getText(source)] = literal(node.initializer);
    if (ts.isBinaryExpression(node) && ['Rooms','RoomsRewrite'].includes(node.left.getText(source)) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isObjectLiteralExpression(node.right))
      objects[node.left.getText(source)] = literal(node.right);
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (!objects.Rooms) throw new Error('Rooms literal not found.');
const plain = value => String(value ?? '').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const merged = Object.entries(objects.Rooms).map(([id, base]) => {
  const override = objects.RoomsRewrite?.[id] ?? {};
  const current = {...base, ...override};
  return {id, name:plain(current.name), type:current.type, description:plain(current.text), ...(current.link ? {link:current.link} : {}), base, override};
});
const selects = [...html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)].filter(m=>/name="(?:building|floor)"/.test(m[1])).map(m=>({
  name:/name="([^"]+)"/.exec(m[1])?.[1],
  options:[...m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(o=>({value:/value="([^"]*)"/.exec(o[1])?.[1], label:plain(o[2]), selected:/\bselected(?:=|\s|$)/.test(o[1]), building:/data-building="([^"]+)"/.exec(o[1])?.[1]}))
}));
const typeFills = {};
for (const rule of html.matchAll(/(\.imatype\d+(?:\s*,\s*\.imatype\d+)*)\s*\{([^}]+)\}/g)) {
  const fill = /\bfill:\s*([^;]+);/.exec(rule[2]);
  if (fill) for (const cls of rule[1].match(/imatype\d+/g)) typeFills[cls] = fill[1].trim();
}
const result = {source_file:path.basename(file), sha256:crypto.createHash('sha256').update(html).digest('hex'), extracted_at:new Date().toISOString(), extraction:'TypeScript AST literal parser; no source code executed.', selects, type_fills:typeFills, count:merged.length, rooms:merged};
const target = file.replace(/\.html$/, '.metadata.json');
await fs.writeFile(target,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({target,count:merged.length,selects,type_fills:typeFills,rooms:merged.map(({id,name,type,link})=>({id,name,type,link}))},null,2));
