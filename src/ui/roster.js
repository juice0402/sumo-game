// 部屋の力士（3枠）・力士の編集（四股名・称号はくるくる回して選ぶ・切り直す・引退）
import { T } from '../data/text.js';
import { SHIKONA } from '../data/shikona.js';
import { TITLES } from '../data/titles.js';
import { shikonaText, titleText, wordText } from '../game/names.js';
import { PAPERS } from '../data/papers.js';
import { AURAS } from '../data/auras.js';
import { drawShapeThumb, thumbAuraBox } from './pick.js';
import { createRoller } from './roller.js';
import { auraPreview } from './aura.js';

// 縦書きの名前：字の数を --n に入れて、列の高さに収まる大きさにする（CSS の font-size が --n を使う）
export function fitText(el, text) {
  el.textContent = text;
  setN(el);
  el.classList.add('fit');
}
// 字の数だけ入れる（大きさは CSS が、入れ物の高さ 100cqh と --n から決める＝どの画面の高さでも1列に収まる）
export function setN(el) { el.style.setProperty('--n', String(Math.max(2, Array.from(el.textContent).length))); }
// ならんだ字の大きさをそろえる：いちばん字の多いものの --n をみんなに
export function sameSize(els) {
  const n = Math.max(2, ...[...els].map((e) => Array.from(e.textContent).length));
  for (const e of els) e.style.setProperty('--n', String(n));
}
// 力士の編集の名前：字の大きさはいつも同じ（11/26 しょーくん「A＝固定」）。大きさは、2列に折ったときの
// 長いほうの列（いちばん長い「上の句＋つなぎ」と「下の句」）が入る大きさ。1列で入る所は1列のまま、
// 入らないときだけ2列に折る（11/26「余白あるのに変な改行」）。折る所は、2列の長さが近くなるほう（同じなら下の句の前）
const len = (t) => Array.from(t).length;
const longest = (g) => Math.max(...SHIKONA[g].map((w) => len(w.t)));
export const ED_NAME_COL = Math.max(longest('kami') + longest('tsunagi'), longest('shimo'));
export function edNameBreak(ids) {
  const [k, t, s] = ids.map(wordText);
  const late = [k + t, s], early = [k, t + s];
  return Math.max(len(early[0]), len(early[1])) < Math.max(len(late[0]), len(late[1])) ? early : late;
}
function paintEdName(el, ids) {
  el.textContent = ids.map(wordText).join('');
  el.style.setProperty('--n', String(ED_NAME_COL));
  el.classList.add('fit');
  const box = el.closest('.hero');
  if (!box || !box.clientHeight || el.offsetHeight <= box.clientHeight - 8) return;   // 1列で入る（かくれている間ははかれないので、見えたら描きなおす）
  const [a, b] = edNameBreak(ids);
  el.textContent = a;
  el.appendChild(document.createElement('br'));
  el.appendChild(document.createTextNode(b));
}
// 縦の見出し：中の span に字を入れて --n を
export function headText(h1, text) {
  let sp = h1.querySelector('span');
  if (!sp) { h1.textContent = ''; sp = document.createElement('span'); h1.appendChild(sp); }
  sp.textContent = text;
  setN(sp);
}

// 力士のカード（部屋の力士・力士選出で使う）。番付表の1列＝1力士。opt：{ onPick(i, ボタン), emptyOk }
// 朱の帯は、はじめはのせない（タップしたときに choose.js でベタッと・11/26 しょーくん）
// 勝敗とレートは部屋（ユーザー）のもので、力士の札には出さない（11/26 しょーくん「いろんな力士を作りやすく」）
// 名前の字の大きさは、ならんだ札でそろえる（いちばん長い名前に合わせる・11/26 しょーくん「統一感」）
export function renderSlots(el, slots, opt) {
  el.textContent = '';
  slots.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot' + (s ? '' : ' empty');
    if (!s && !opt.emptyOk) b.disabled = true;
    if (s) {
      b.innerHTML = '<canvas></canvas><span class="who"><small></small><b class="brush"></b><em></em></span>';
      b.querySelector('small').textContent = titleText(s.title);
      fitText(b.querySelector('b'), shikonaText(s.shikona));
    } else {
      b.innerHTML = '<span class="plus brush">＋</span><span class="who"><b class="brush"></b><em></em></span>';
      fitText(b.querySelector('b'), T.slotEmpty);
      b.querySelector('em').textContent = opt.emptyOk ? T.slotCut : '';
    }
    b.addEventListener('click', () => opt.onPick(i, b));
    el.appendChild(b);
  });
  sameSize(el.querySelectorAll('.slot:not(.empty) .who b'));
  // 描くのはならべてから（canvas の大きさが決まってから）
  slots.forEach((s, i) => { if (s) drawShapeThumb(el.children[i].querySelector('canvas'), s.shape, false, s.paper); });
}

// ドラムに並べる語。has：持っている語（Set）。えらべるのはその中だけ（11/26：ほかの語は、あとで手に入れる）
function itemsOf(g, has) {
  if (g === 'title') return TITLES.filter((t) => has.has(t.id)).map((t) => ({ id: t.id, label: t.t }));
  return SHIKONA[g].filter((w) => has.has(w.id)).map((w) => ({ id: w.id, label: wordText(w.id) || T.rollNone }));
}

// 力士の編集。cb：{ getSlot(i), getOwned()＝持っている語と称号の Set, getMise()＝{ papers, auras }（持っている紙質・気の id）, onChange(i), onRecut(i), onRetire(i), onDone() }
// 「名前」と「見た目」（紙質・気＝11/26 福箱）の2つのドラムを、上の切りかえで
export function initEdit(cb) {
  const cv = document.getElementById('ed-cv');
  let idx = 0, saveT = 0;
  const G = { kami: 0, tsunagi: 1, shimo: 2 };

  function paintName() {
    const s = cb.getSlot(idx);
    if (!s) return;
    document.getElementById('ed-title').textContent = titleText(s.title);
    paintEdName(document.getElementById('ed-name'), s.shikona);
  }
  // 画面が見えたとき・大きさが変わったときに、1列か2列かを決めなおす
  if (window.ResizeObserver) new ResizeObserver(() => { if (cb.getSlot(idx)) paintName(); }).observe(document.querySelector('#s-edit .hero'));
  // まわしている間は名前だけ描きなおし、保存は止まってから
  const saveLater = () => { clearTimeout(saveT); saveT = setTimeout(() => cb.onChange(idx), 300); };

  // 力士の絵と、まわりの気
  const auraCv = document.getElementById('ed-aura');
  let aura = null;
  function paintLook() {
    const s = cb.getSlot(idx);
    drawShapeThumb(cv, s.shape, false, s.paper);
    if (aura) aura.stop();
    aura = auraPreview(auraCv, s.aura, thumbAuraBox(auraCv, cv, s.shape));
  }

  const rollers = {}, mise = {};
  for (const col of document.querySelectorAll('#ed-roller .rl-col')) {
    const g = col.dataset.g;
    if (g === 'paper' || g === 'aura') {
      mise[g] = createRoller(col, (id) => {
        const s = cb.getSlot(idx);
        if (!s) return;
        s[g] = id;
        paintLook();
        saveLater();
      });
      continue;
    }
    rollers[g] = createRoller(col, (id) => {
      const s = cb.getSlot(idx);
      if (!s) return;
      if (g === 'title') s.title = id; else s.shikona[G[g]] = id;
      paintName();
      saveLater();
    });
  }
  // 名前／称号／見た目の切りかえ（ドラムは見えてから並べる：かくれていると幅と位置がはかれないため）
  let tab = 'name';
  const tabs = document.querySelectorAll('#ed-tabs button');
  function setTab(t) {
    tab = t;
    for (const b of tabs) b.setAttribute('aria-pressed', String(b.dataset.t === t));
    for (const k of ['name', 'title', 'mise']) for (const el of document.querySelectorAll(`#ed-roller .rl-${k}`)) el.hidden = t !== k;
    document.getElementById('ed-titles').hidden = t !== 'title';   // 称号のページだけ
    if (t === 'mise') setMise(); else setRollers(t);
  }
  for (const b of tabs) b.addEventListener('click', () => { if (b.dataset.t !== tab) setTab(b.dataset.t); });
  function setMise() {
    const s = cb.getSlot(idx), m = cb.getMise();
    mise.paper.set(m.papers.map((id) => ({ id, label: PAPERS[id].name })), s.paper);
    mise.aura.set(m.auras.map((id) => ({ id, label: AURAS[id].name })), s.aura);
    const left = (Object.keys(PAPERS).length - m.papers.length) + (Object.keys(AURAS).length - m.auras.length);
    document.getElementById('ed-locked').textContent = left ? T.lockedLook(left) : '';
  }
  function setRollers(t) {
    const s = cb.getSlot(idx), has = cb.getOwned();
    for (const g of t === 'title' ? ['title'] : ['kami', 'tsunagi', 'shimo']) rollers[g].set(itemsOf(g, has), g === 'title' ? s.title : s.shikona[G[g]]);
    document.getElementById('ed-locked').textContent = '';   // 名前・称号のページに説明は出さない（11/26 しょーくん「左の説明はいらない」）
  }

  document.getElementById('ed-recut').addEventListener('click', () => cb.onRecut(idx));
  document.getElementById('ed-done').addEventListener('click', () => { clearTimeout(saveT); cb.onChange(idx); cb.onDone(); });
  // 引退は2回押す（確かめの窓は、試しのページの中では出せないことがあるため）
  const retire = document.getElementById('ed-retire');
  let armed = 0;
  function disarm() { armed = 0; retire.textContent = T.retire; retire.setAttribute('aria-pressed', 'false'); }
  retire.addEventListener('click', () => {
    if (armed && performance.now() - armed < 4000) { disarm(); cb.onRetire(idx); return; }
    armed = performance.now();
    retire.textContent = T.retireAgain;
    retire.setAttribute('aria-pressed', 'true');
  });

  return {
    show(i) {
      idx = i;
      disarm();
      paintName();
      paintLook();
      setTab('name');
    },
  };
}
