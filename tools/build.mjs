// src を1つの index.html にまとめる（Node の標準だけ）。
//   node tools/build.mjs [--artifact 出力.html]
// - src/ の ES モジュールを、import/export を外して順につなぐ（import は1行で `import { a, b } from './x.js';` の形だけ）
// - 物理（Rapier 決定論版）は node_modules から読んでそのまま入れる
// - 「指紋」の正しい値を、ここで計算して入れる（道具の画面でくらべる）
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import { setRapier } from '../src/sim/battle.js';
import { fingerprint } from '../src/sim/bench.js';
import { CONFIG_VERSION } from '../src/data/config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(root, p).split('\\').join('/');
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)';?[ \t]*$/gm;

const order = [], seen = new Set();
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) visit(resolve(dirname(file), m[2]));
  if (/^import\s/m.test(src.replace(IMPORT_RE, ''))) throw new Error(`${rel(file)}: import の形が対応していない`);
  order.push(file);
}
visit(resolve(root, 'src/ui/app.js'));

function wrap(file) {
  let src = readFileSync(file, 'utf8');
  const names = [];
  src = src.replace(IMPORT_RE, (_, list, from) => {
    const target = rel(resolve(dirname(file), from));
    const binds = list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ': '));
    return `const { ${binds.join(', ')} } = __m['${target}'];`;
  });
  src = src.replace(/^export\s+((?:async\s+)?function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
    names.push(name);
    return `${kind} ${name}`;
  });
  if (/^export\s/m.test(src)) throw new Error(`${rel(file)}: export の形が対応していない`);
  return `__m['${rel(file)}'] = (function () {\n${src}\nreturn { ${names.join(', ')} };\n})();\n`;
}
const bundle = `(function () {\n'use strict';\nconst __m = {};\n${order.map(wrap).join('\n')}})();\n`;

const rapierPkg = JSON.parse(readFileSync(resolve(root, 'node_modules/@dimforge/rapier2d-deterministic-compat/package.json'), 'utf8'));
const rapierSrc = readFileSync(resolve(root, 'node_modules/@dimforge/rapier2d-deterministic-compat/dist/rapier.cjs'), 'utf8')
  .replace(/^\/\/# sourceMappingURL=.*$/gm, '');
const rapierJs = `(function () {\nvar module = { exports: {} }; var exports = module.exports;\n${rapierSrc}\nwindow.RAPIER = module.exports;\n})();\n`;

await RAPIER.init();
setRapier(RAPIER);
const info = { fp: fingerprint(), rapier: rapierPkg.version, config: CONFIG_VERSION };

const css = readFileSync(resolve(root, 'src/ui/style.css'), 'utf8');
const page = readFileSync(resolve(root, 'src/ui/page.html'), 'utf8').replace('/*STYLE*/', () => css);
const scripts = `<script>window.SUMO_BUILD = ${JSON.stringify(info)};</script>\n<script>\n${rapierJs}</script>\n<script>\n${bundle}</script>\n`;
for (const s of [bundle]) if (/<\/script/i.test(s)) throw new Error('</script が入っている');
const content = page.replace('<!--SCRIPTS-->', () => scripts);

const cut = content.indexOf('</style>') + '</style>'.length;
const html = `<!doctype html>
<!-- 自動で作るファイル・手で直さない（もとは src/。node tools/build.mjs で作る） -->
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${content.slice(0, cut)}
</head>
<body>
${content.slice(cut)}</body>
</html>
`;
writeFileSync(resolve(root, 'index.html'), html);
const ai = process.argv.indexOf('--artifact');
if (ai >= 0) writeFileSync(resolve(process.argv[ai + 1]), content);
console.log(`index.html ${(html.length / 1e6).toFixed(2)}MB・モジュール ${order.length}・指紋 ${info.fp}`);
