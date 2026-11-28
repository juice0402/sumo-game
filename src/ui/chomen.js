// 帳面（#28）：取組記録（押すとリプレイ）・実績・図鑑。番付表の列（右から1列ずつ・横にすべらせる）。
// 図鑑と実績は見るだけ（そろえても、ほかのごほうびはない＝コンプガチャにしない・game-art-rule.md「ガチャ」）。
// 持っていない物は「？？？」＋手に入れ方（福箱の物は段だけ・実績の称号は条件をはっきり）。いくつあるかの数は出さない。
import { T } from '../data/text.js';
import { STAGES } from '../data/stages.js';
import { TITLES, TITLE_ACH, TITLE_START } from '../data/titles.js';
import { PAPERS, PAPER_DEFAULT } from '../data/papers.js';
import { AURAS, AURA_DEFAULT } from '../data/auras.js';
import { DOHYO } from '../data/dohyo.js';
import { SHIKONA, SHIKONA_START } from '../data/shikona.js';
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { FUKU_ITEMS, tierOf } from '../game/fukubako.js';
import { achProgress } from '../game/titles.js';
import { canReplay } from '../game/log.js';
import { wordText } from '../game/names.js';
import { drawShapeThumb, thumbAuraBox } from './pick.js';
import { auraPreview } from './aura.js';
import { drawDohyoSwatch } from './fuku.js';
import { sameSize } from './roster.js';
import { choose } from './choose.js';

const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const titleName = (id) => (TITLES.find((t) => t.id === id) || {}).t || '';

// cb：{ getState(), getOwned()＝持っている物の Set（道具の「ぜんぶ持っている」もふくむ）, onReplay(取組) }
export function initChomen(cb) {
  const list = document.getElementById('ch-list'), note = document.getElementById('ch-note');
  const tabs = document.getElementById('ch-tabs'), kinds = document.getElementById('ch-kinds');
  let tab = 'log', kind = 'paper', keep = 0, io = null, back = false;
  const live = new Map();   // 動いている気の見本（見えている列だけ）

  function stopLive() {
    if (io) { io.disconnect(); io = null; }
    for (const p of live.values()) p.stop();
    live.clear();
  }
  function begin(cls, rows = 1) {
    stopLive();
    list.textContent = '';
    list.className = 'chlist frame2 cols ' + cls + (rows > 1 ? ' r2' : '');
  }

  // 取組記録：新しい順（いちばん右が最新）。見られる取組だけボタン
  function paintLog(st) {
    begin('chlog');
    if (!st.log.length) { const d = mk('div', 'chempty'); d.appendChild(mk('span', '', T.logNone)); list.appendChild(d); return; }
    st.log.forEach((e, i) => {
      const ok = canReplay(e);
      const c = mk(ok ? 'button' : 'div', 'chb' + (ok ? '' : ' old'));
      if (ok) { c.type = 'button'; c.dataset.i = i; }
      const S = STAGES[e.stage];
      c.appendChild(mk('small', '', T.mode[e.mode] + (e.mode === 'jungyo' && S ? '・' + S.name : '')));
      const mid = mk('span', 'mid');
      mid.appendChild(mk('i', 'hanko brush ' + (e.w === 'a' ? 'win' : e.w === 'b' ? 'lose' : 'draw'), e.w === 'a' ? T.win : e.w === 'b' ? T.lose : T.draw));
      mid.appendChild(mk('b', 'brush', e.a.name));
      c.appendChild(mid);
      c.appendChild(mk('span', 'sub', T.logVs(e.b.name) + (T.kimarite[e.km] ? '・' + T.kimarite[e.km] : '')));
      c.appendChild(mk('em', '', ok ? T.logWhen(e.t) : T.logOld));
      list.appendChild(c);
    });
    sameSize(list.querySelectorAll('.mid b'));
  }

  // 実績：称号の一覧（data/titles.js の TITLE_ACH）。手に入れた＝名前と条件、まだ＝？？？＋条件＋いまの進み
  function paintAch(st, has) {
    begin('chach');
    for (const id of Object.keys(TITLE_ACH)) {
      const got = has.has(id);
      const c = mk('div', 'chi' + (got ? ' got' : ' not'));
      let now = '';
      if (got) now = T.achGot;
      else {
        const p = achProgress(st, id);
        if (p && p.rank) now = T.achRank(p.rank);
        else if (p) now = T.achNow(p.n, p.of);
      }
      c.appendChild(mk('small', '', now));
      c.appendChild(mk('b', 'brush', got ? titleName(id) : T.titleUnknown));
      c.appendChild(mk('span', '', TITLE_ACH[id]));
      list.appendChild(c);
    }
    sameSize(list.querySelectorAll('.chi.got b'));
  }

  // 図鑑：種類ごと。持っている物は小さな見本（紙質＝力士の形・気＝気の見本・土俵＝箱の見本・称号と語＝字）
  const fukuIds = (k) => FUKU_ITEMS.filter((it) => it.kind === k).map((it) => it.id);
  function zkItems() {
    if (kind === 'paper') return Object.keys(PAPERS).map((id) => ({ id, name: PAPERS[id].name, start: id === PAPER_DEFAULT }));
    if (kind === 'aura') return Object.keys(AURAS).filter((id) => id !== AURA_DEFAULT).map((id) => ({ id, name: AURAS[id].name }));
    if (kind === 'dohyo') return [{ id: 'kami', key: 'kami', name: DOHYO.kami.name, start: true }, ...fukuIds('dohyo').map((id) => ({ id, key: id.slice(2), name: DOHYO[id.slice(2)].name }))];
    if (kind === 'title') return TITLES.map((t) => ({ id: t.id, name: t.t, start: t.id === TITLE_START, how: TITLE_ACH[t.id] }));
    return ['kami', 'shimo'].flatMap((g) => SHIKONA[g].map((w) => ({ id: w.id, name: wordText(w.id), start: SHIKONA_START.includes(w.id) })));
  }
  function paintZukan(st, has) {
    const words = kind === 'word';
    begin('chzk zk-' + kind, words ? 2 : 1);
    const shape = (st.slots[st.active] || {}).shape || CPU_SHAPES[0].pts;
    const paper = (st.slots[st.active] || {}).paper || PAPER_DEFAULT;
    const draws = [];
    for (const it of zkItems()) {
      const got = it.start || has.has(it.id);
      const c = mk('div', 'chi' + (got ? ' got' : ' not'));
      const tier = it.start || it.how ? null : tierOf(it.id);
      c.appendChild(mk('small', '', it.start ? T.zkStart : it.how ? T.zkBout : tier ? T.zkFuku : ''));
      const mid = mk('span', 'mid');
      if (tier && !got) { const h = mk('i', 'hanko brush', tier.name); h.style.color = tier.color; mid.appendChild(h); }
      mid.appendChild(mk('b', 'brush', got ? it.name : T.titleUnknown));
      if (got && !words && kind !== 'title') {
        const box = mk('span', 'sw');
        const cv = mk('canvas');
        box.appendChild(cv);
        if (kind === 'aura') { const ac = mk('canvas', 'aura-cv'); box.appendChild(ac); c.dataset.aura = it.id; }
        mid.appendChild(box);
        draws.push([cv, it]);
      }
      c.appendChild(mid);
      if (it.how && !got) c.appendChild(mk('span', '', it.how));   // 実績の称号：条件をはっきり
      list.appendChild(c);
    }
    sameSize(list.querySelectorAll('.chi.got b'));
    // 見本は、見えている列だけ描く（長い一覧・code-rules C）。気は見えている間だけ動かす
    const byCv = new Map(draws);
    io = new IntersectionObserver((ents) => {
      for (const en of ents) {
        const cv = en.target, it = byCv.get(cv);
        if (!en.isIntersecting) { const p = live.get(cv); if (p) { p.stop(); live.delete(cv); } continue; }
        if (!cv.dataset.done) {
          cv.dataset.done = '1';
          if (kind === 'dohyo') drawDohyoSwatch(cv, it.key);
          else drawShapeThumb(cv, shape, false, kind === 'paper' ? it.id : paper);
        }
        if (kind === 'aura' && !live.has(cv)) { const ac = cv.nextSibling; live.set(cv, auraPreview(ac, it.id, thumbAuraBox(ac, cv, shape))); }
      }
    }, { root: list });
    for (const [cv] of draws) io.observe(cv);
  }

  function paint() {
    const st = cb.getState(), has = cb.getOwned();
    for (const b of tabs.children) b.setAttribute('aria-pressed', String(b.dataset.t === tab));
    for (const b of kinds.children) b.setAttribute('aria-pressed', String(b.dataset.k === kind));
    kinds.hidden = tab !== 'zukan';
    if (tab === 'log') paintLog(st); else if (tab === 'ach') paintAch(st, has); else paintZukan(st, has);
    note.textContent = T.chNote[tab];
  }

  tabs.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b && b.dataset.t !== tab) { tab = b.dataset.t; keep = 0; paint(); } });
  kinds.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b && b.dataset.k !== kind) { kind = b.dataset.k; paint(); } });
  list.addEventListener('click', (ev) => {
    const b = ev.target.closest('button.chb');
    if (!b) return;
    const e = cb.getState().log[+b.dataset.i];
    if (!e) return;
    keep = list.scrollLeft;   // リプレイからもどったら同じ所から
    back = true;
    choose(b, () => { stopLive(); cb.onReplay(e); }, true);
  });

  return {
    show() {
      paint();
      list.scrollLeft = back && tab === 'log' ? keep : 0;
      back = false;
    },
  };
}
