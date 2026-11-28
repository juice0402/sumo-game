// src を1つの index.html にまとめる（Node の標準だけ）。
//   node tools/build.mjs [--artifact 出力.html]
// - src/ の ES モジュールを、import/export を外して順につなぐ（import は1行で `import { a, b } from './x.js';` の形だけ）
// - 出口は index.html＋assets/（11/28・code-rules.md の D）：絵・効果音・物理の wasm は assets/ にファイルで置き、
//   名前に中身の印（sha256 の頭8字・例 fuku-box.3f2a9c1e.webp）をつける。ビルドのたびに assets/ はいま使うファイルだけにする。
//   index.html からは相対パス（assets/…）で読む（window.SUMO_ASSETS に名前 → パス）。もとの絵と音は media/art・media/sfx
// - 物理（Rapier 決定論版）の JS と 3D（Three.js r160 の three.min.js・window.THREE）は node_modules から読み、gzip して base64 で入れる
//   （ほどくのは src/ui/unpack.js）。wasm は assets/ のファイル（fetch → arrayBuffer → WebAssembly.instantiate）
// - ゲームのコードと CSS は esbuild で小さくする（コメント・空白・中の名前。11/27 の軽量化：コード 331KB → 166KB。esbuild は devDependencies）
// - 効果音 media/sfx/*.mp3・絵 media/art/*.webp → assets/（ui/sound.js が fetch・ui/art.js が使うときに1枚ずつ Image）
// - 「指紋」の正しい値を、ここで計算して入れる（道具の画面でくらべる）
// - 字（11/28・issue #27）：media/fonts/*.woff2（tools/fonts.py でしぼった字）を assets/ に置き、@font-face を CSS の頭に入れる（ネットの外は読まない）
// - ライセンスの全文（設定 → 権利表記）：media/fonts の OFL・node_modules の Rapier と three の LICENSE をつないで assets/ の licenses.*.txt に
// - 道具（試しのページだけ）：index.html は src/ui/toolsheet.js を toolsheet-off.js に入れかえ、page.html の <!--TOOLS-->…<!--/TOOLS--> を外す。
//   --artifact の試しのページは道具つき（同じ assets/ を使う）
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

// play＝遊ぶ人の index.html（道具なし）／try＝試しのページ（道具つき）
const TOOLSHEET = resolve(root, 'src/ui/toolsheet.js'), TOOLSHEET_OFF = resolve(root, 'src/ui/toolsheet-off.js');
const real = (file, mode) => (mode === 'play' && file === TOOLSHEET ? TOOLSHEET_OFF : file);
function modules(mode) {
  const order = [], seen = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(real(file, mode), 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) visit(resolve(dirname(file), m[2]));
    if (/^import\s/m.test(src.replace(IMPORT_RE, ''))) throw new Error(`${rel(file)}: import の形が対応していない`);
    order.push(file);
  }
  visit(resolve(root, 'src/ui/app.js'));
  return order;
}

function wrap(file, mode) {
  let src = readFileSync(real(file, mode), 'utf8');
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
const order = modules('play'), orderTry = modules('try');
const rawOf = (mode, list) => `(function () {\n'use strict';\nconst __m = {};\n${list.map((f) => wrap(f, mode)).join('\n')}})();\n`;
const rawBundle = rawOf('play', order);
// 小さくする（11/27 の軽量化）：コメント・空白をとり、中の名前を短くする（esbuild・日本語の字はそのまま＝charset utf8）。
// esbuild がないとき（npm ci の前）は、そのまま入れる（動きは同じ・大きいだけ）
let esbuild = null;
try { esbuild = await import('esbuild'); } catch (e) { console.warn('esbuild がないので小さくしない（npm ci で入る）'); }
const mini = (code, loader) => (esbuild ? esbuild.transformSync(code, { loader, minify: true, charset: 'utf8', legalComments: 'none', target: loader === 'css' ? 'safari14' : 'es2020' }).code : code);
const bundle = mini(rawBundle, 'js');
const bundleTry = mini(rawOf('try', orderTry), 'js');

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

// assets/：出口の横に置くファイル（名前に中身の印）。いま使うものだけを残す
const outDir = resolve(root, 'assets');
mkdirSync(outDir, { recursive: true });
const keep = new Set();
function put(name, ext, buf) {
  const file = `${name}.${createHash('sha256').update(buf).digest('hex').slice(0, 8)}.${ext}`;
  if (keep.has(file)) throw new Error(`assets の名前がかぶった：${file}`);
  keep.add(file);
  const path = resolve(outDir, file);
  if (!existsSync(path)) writeFileSync(path, buf);
  return `assets/${file}`;   // index.html から相対（頭に / をつけない）
}
const ASSETS = { art: {}, sfx: {}, wasm: put('rapier', 'wasm', wasmBin) };
// 効果音
const sfxDir = resolve(root, 'media/sfx');
if (existsSync(sfxDir)) {
  for (const f of readdirSync(sfxDir).sort()) if (f.endsWith('.mp3')) ASSETS.sfx[f.slice(0, -4)] = put(f.slice(0, -4), 'mp3', readFileSync(resolve(sfxDir, f)));
}
// 絵（Codex などの絵）
const artDir = resolve(root, 'media/art');
if (existsSync(artDir)) {
  for (const f of readdirSync(artDir).sort()) if (f.endsWith('.webp')) ASSETS.art[f.slice(0, -5)] = put(f.slice(0, -5), 'webp', readFileSync(resolve(artDir, f)));
}
// 字（tools/fonts.py が作る woff2 と fonts.json）
const fontInfo = JSON.parse(readFileSync(resolve(root, 'media/fonts/fonts.json'), 'utf8'));
ASSETS.fonts = {};
let fontCss = '', fontBytes = 0;
for (const f of fontInfo.faces) {
  const buf = readFileSync(resolve(root, 'media/fonts', f.name + '.woff2'));
  fontBytes += buf.length;
  ASSETS.fonts[f.name] = put(f.name, 'woff2', buf);
  fontCss += `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;font-display:swap;src:url("${ASSETS.fonts[f.name]}") format("woff2")}\n`;
}
// 先に読む字：筆の字（タイトルから使う）とゴシックの 500（説明の字）
const fontPreload = ['yuji-syuku', 'zen-kaku-500'].filter((n) => ASSETS.fonts[n])
  .map((n) => `<link rel="preload" href="${ASSETS.fonts[n]}" as="font" type="font/woff2" crossorigin>`).join('\n');
// ライセンスの全文（設定 → 権利表記 → ライセンスの全文）
const licParts = [
  ['Yuji Syuku (SIL Open Font License 1.1)', 'media/fonts/OFL-YujiSyuku.txt'],
  ['Zen Kaku Gothic New (SIL Open Font License 1.1)', 'media/fonts/OFL-ZenKakuGothicNew.txt'],
  [`Rapier ${'{RV}'} (Apache License 2.0)`, 'node_modules/@dimforge/rapier2d-deterministic-compat/LICENSE'],
  [`three.js ${'{TV}'} (MIT License)`, 'node_modules/three/LICENSE'],
];
const licText = licParts.map(([h, f]) => `== ${h} ==\n\n${readFileSync(resolve(root, f), 'utf8').trim()}\n`).join('\n\n')
  .replace('{RV}', JSON.parse(readFileSync(resolve(root, 'node_modules/@dimforge/rapier2d-deterministic-compat/package.json'), 'utf8')).version)
  .replace('{TV}', JSON.parse(readFileSync(resolve(root, 'node_modules/three/package.json'), 'utf8')).version);
ASSETS.licenses = put('licenses', 'txt', Buffer.from(licText));
let gone = 0;
for (const f of readdirSync(outDir)) if (!keep.has(f)) { unlinkSync(resolve(outDir, f)); gone++; }   // 古い名前のファイルを消す

await RAPIER.init();
setRapier(RAPIER);
const info = { fp: fingerprint(), rapier: rapierPkg.version, three: threePkg.version, config: CONFIG_VERSION };

const css = mini(fontCss + readFileSync(resolve(root, 'src/ui/style.css'), 'utf8'), 'css');
const pageSrc = readFileSync(resolve(root, 'src/ui/page.html'), 'utf8').replace('/*STYLE*/', () => css).replace('<!--FONTS-->', () => fontPreload);
const TOOLS_RE = /<!--TOOLS-->[\s\S]*?<!--\/TOOLS-->\n?/g;
const page = pageSrc.replace(TOOLS_RE, '');                                   // 遊ぶ人の index.html：道具なし
const pageTry = pageSrc.replace(/<!--\/?TOOLS-->/g, '');                      // 試しのページ：道具つき
if (/b-tools|s-tools/.test(page)) throw new Error('index.html に道具が残っている');
// はじめの画面を早く出すため、ゲームのコードを先に・重いもの（物理・3D・効果音）は最後に「まだ動かさない形」で入れる。
// ゲームのコードが切る画面を出してから、ui/app.js の loadLibs が順に動かす
const libs = `<script type="text/plain" id="lib-rapier">\n${gz64(Buffer.from(rapierJs))}</script>\n`
  + `<script type="text/plain" id="lib-three">\n${gz64(Buffer.from(threeJs))}</script>\n`;
const scriptsOf = (code) => `<script>window.SUMO_BUILD = ${JSON.stringify(info)};\nwindow.SUMO_ASSETS = ${JSON.stringify(ASSETS)};</script>\n<script>\n${code}</script>\n` + libs;
for (const s of [bundle, bundleTry, threeJs, rapierJs]) if (/<\/script/i.test(s)) throw new Error('</script が入っている');
const content = page.replace('<!--SCRIPTS-->', () => scriptsOf(bundle));

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
if (ai >= 0) {   // 試しのページ：中身と、Artifact の files に渡す assets/ の一覧（<出力>.files.json）
  writeFileSync(resolve(process.argv[ai + 1]), pageTry.replace('<!--SCRIPTS-->', () => scriptsOf(bundleTry)));
  writeFileSync(resolve(process.argv[ai + 1] + '.files.json'), JSON.stringify(Object.fromEntries([...keep].sort().map((f) => [`assets/${f}`, resolve(outDir, f)])), null, 1));
}
let assetBytes = 0;
for (const f of keep) assetBytes += readFileSync(resolve(outDir, f)).length;
console.log(`index.html ${(Buffer.byteLength(html) / 1e6).toFixed(2)}MB（コード ${(Buffer.byteLength(rawBundle) / 1e3).toFixed(0)}KB → ${(Buffer.byteLength(bundle) / 1e3).toFixed(0)}KB）・モジュール ${order.length}・assets ${keep.size}こ ${(assetBytes / 1e6).toFixed(2)}MB（効果音 ${Object.keys(ASSETS.sfx).length}・絵 ${Object.keys(ASSETS.art).length}・wasm 1${gone ? `・古いもの ${gone} を消した` : ''}）・字 ${(fontBytes / 1e6).toFixed(2)}MB・指紋 ${info.fp}`);
