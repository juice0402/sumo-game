// src を1つの index.html にまとめる（Node の標準だけ）。
//   node tools/build.mjs [--artifact 出力.html]
// - src/ の ES モジュールを、import/export を外して順につなぐ（import は1行で `import { a, b } from './x.js';` の形だけ）
// - 物理（Rapier 決定論版）と 3D（Three.js r160 の three.min.js・window.THREE）は node_modules から読み、gzip して base64 で入れる
//   （wasm も別に gzip。ほどくのは src/ui/unpack.js・11/25 の軽量化：4.39MB → 約1.7MB）
// - ゲームのコードと CSS は esbuild で小さくする（コメント・空白・中の名前。11/27 の軽量化：コード 331KB → 166KB。esbuild は devDependencies）
// - 効果音 assets/sfx/*.mp3 は base64 にして window.SUMO_SFX に入れる（コードには埋めこまない）
// - 絵 assets/art/*.webp は base64 にして絵ごとの script（art-<名前>）に入れる（ui/art.js が使うときに1枚ずつ画像にする）
// - 「指紋」の正しい値を、ここで計算して入れる（道具の画面でくらべる）
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
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
const rawBundle = `(function () {\n'use strict';\nconst __m = {};\n${order.map(wrap).join('\n')}})();\n`;
// 小さくする（11/27 の軽量化）：コメント・空白をとり、中の名前を短くする（esbuild・日本語の字はそのまま＝charset utf8）。
// esbuild がないとき（npm ci の前）は、そのまま入れる（動きは同じ・大きいだけ）
let esbuild = null;
try { esbuild = await import('esbuild'); } catch (e) { console.warn('esbuild がないので小さくしない（npm ci で入る）'); }
const mini = (code, loader) => (esbuild ? esbuild.transformSync(code, { loader, minify: true, charset: 'utf8', legalComments: 'none', target: loader === 'css' ? 'safari14' : 'es2020' }).code : code);
const bundle = mini(rawBundle, 'js');

const rapierPkg = JSON.parse(readFileSync(resolve(root, 'node_modules/@dimforge/rapier2d-deterministic-compat/package.json'), 'utf8'));
const rapierSrc = readFileSync(resolve(root, 'node_modules/@dimforge/rapier2d-deterministic-compat/dist/rapier.cjs'), 'utf8')
  .replace(/^\/\/# sourceMappingURL=.*$/gm, '');
// wasm は文字（base64）のまま JS に入っているので取り出して、JS からは window.__SUMO_WASM（ほどいた ArrayBuffer）を読ませる
const WASM_RE = /[A-Za-z_$][\w$]*\.toByteArray\("(AGFzbQ[A-Za-z0-9+/=]+)"\)\.buffer/g;
const wasmHits = [...rapierSrc.matchAll(WASM_RE)];
if (wasmHits.length !== 1) throw new Error(`Rapier の wasm が見つからない（${wasmHits.length}）`);
const wasmBin = Buffer.from(wasmHits[0][1], 'base64');
const rapierJs = `(function () {\nvar module = { exports: {} }; var exports = module.exports;\n${rapierSrc.replace(WASM_RE, () => 'window.__SUMO_WASM')}\nwindow.RAPIER = module.exports;\n})();\n`;
const gz64 = (buf) => gzipSync(buf, { level: 9 }).toString('base64');

// 3D：UMD の three.min.js（そのまま入れると window.THREE になる）。古い書き方の注意の1行だけ消す
const threePkg = JSON.parse(readFileSync(resolve(root, 'node_modules/three/package.json'), 'utf8'));
const threeJs = readFileSync(resolve(root, 'node_modules/three/build/three.min.js'), 'utf8')
  .replace(/^console\.warn\([^\n]*?\),/, 'void 0,');

// 効果音
const sfxDir = resolve(root, 'assets/sfx');
const sfx = {};
if (existsSync(sfxDir)) {
  for (const f of readdirSync(sfxDir).sort()) {
    if (!f.endsWith('.mp3')) continue;
    sfx[f.slice(0, -4)] = 'data:audio/mpeg;base64,' + readFileSync(resolve(sfxDir, f)).toString('base64');
  }
}

// 絵（assets/art/*.webp・Codex などの絵）。絵ごとに script（id="art-<名前>"）に base64 だけを入れ、使うときに ui/art.js が1枚ずつ画像にする
const artDir = resolve(root, 'assets/art');
const art = {};
if (existsSync(artDir)) {
  for (const f of readdirSync(artDir).sort()) {
    if (!f.endsWith('.webp')) continue;
    art[f.slice(0, -5)] = readFileSync(resolve(artDir, f)).toString('base64');
  }
}

await RAPIER.init();
setRapier(RAPIER);
const info = { fp: fingerprint(), rapier: rapierPkg.version, three: threePkg.version, config: CONFIG_VERSION };

const css = mini(readFileSync(resolve(root, 'src/ui/style.css'), 'utf8'), 'css');
const page = readFileSync(resolve(root, 'src/ui/page.html'), 'utf8').replace('/*STYLE*/', () => css);
// はじめの画面を早く出すため、ゲームのコードを先に・重いもの（物理・3D・効果音）は最後に「まだ動かさない形」で入れる。
// ゲームのコードが切る画面を出してから、ui/app.js の loadLibs が順に動かす
const scripts = `<script>window.SUMO_BUILD = ${JSON.stringify(info)};</script>\n<script>\n${bundle}</script>\n`
  + `<script type="text/plain" id="lib-rapier">\n${gz64(Buffer.from(rapierJs))}</script>\n<script type="text/plain" id="lib-wasm">\n${gz64(wasmBin)}</script>\n`
  + `<script type="text/plain" id="lib-three">\n${gz64(Buffer.from(threeJs))}</script>\n`
  + `<script type="application/json" id="lib-sfx">${JSON.stringify(sfx)}</script>\n`
  + Object.entries(art).map(([k, b]) => `<script type="text/plain" id="art-${k}">${b}</script>\n`).join('');
for (const s of [bundle, threeJs, rapierJs]) if (/<\/script/i.test(s)) throw new Error('</script が入っている');
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
console.log(`index.html ${(Buffer.byteLength(html) / 1e6).toFixed(2)}MB（コード ${(Buffer.byteLength(rawBundle) / 1e3).toFixed(0)}KB → ${(Buffer.byteLength(bundle) / 1e3).toFixed(0)}KB）・モジュール ${order.length}・効果音 ${Object.keys(sfx).length}・絵 ${Object.keys(art).length}・指紋 ${info.fp}`);
