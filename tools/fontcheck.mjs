// 字（フォント）の点検：src/ に出てくる字が、同梱の字（media/fonts/*.woff2）に入っているか（11/28・issue #27）。
//   node tools/fontcheck.mjs   → 足りない字を出す（なければ1行）。tools/test.mjs も呼ぶ
// 入っている字の一覧は media/fonts/fonts.json（python3 -I tools/fonts.py が woff2 といっしょに書く）。
// 足りない字があったら python3 -I tools/fonts.py を動かして、woff2 と fonts.json をコミットする。
// もとの字（ttf）にない字（absent）は入れようがないので数えない（端末の字で出る）。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// コメントを外す（tools/fonts.py の strip_comments と同じ3つの決まり）
export function stripComments(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[\s;,{}()\]])\/\/[^\n]*/gm, '$1');
}

function walk(dir, out) {
  for (const f of readdirSync(dir).sort()) {
    const p = resolve(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.js', '.html', '.css'].includes(extname(p))) out.push(p);
  }
  return out;
}

export function srcChars() {
  const s = new Set();
  for (const p of walk(resolve(root, 'src'), [])) for (const c of stripComments(readFileSync(p, 'utf8'))) if (c.codePointAt(0) >= 0x20) s.add(c);
  return s;
}

// 足りない字：{ 名前: '字字字' }（なければ空）
export function missingGlyphs() {
  const info = JSON.parse(readFileSync(resolve(root, 'media/fonts/fonts.json'), 'utf8'));
  const want = srcChars();
  const out = {};
  for (const f of info.faces) {
    const have = new Set([...f.chars, ...f.absent, ' ']);
    const miss = [...want].filter((c) => !have.has(c));
    if (miss.length) out[f.name] = miss.join('');
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const miss = missingGlyphs();
  const names = Object.keys(miss);
  if (!names.length) console.log('字：src/ の字はぜんぶ入っている');
  else {
    for (const n of names) console.log(`字：${n} に足りない字 ${[...miss[n]].length}こ「${miss[n]}」`);
    console.log('→ python3 -I tools/fonts.py で作りなおして、media/fonts/ の woff2 と fonts.json をコミット');
    process.exit(1);
  }
}
