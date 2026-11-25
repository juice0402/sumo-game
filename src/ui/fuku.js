// 福箱の画面（11/26 しょーくん）：小判で買って開ける・出る物と確率の一覧。
// 開け方は「和紙で包んだ箱をゆらす（太鼓）→ 朱の筆で切る → 紙が左右にさける → 中身」。スロットやパチンコには似せない（game-art-rule.md）
// 引いた物は、動きの前に保存する（とちゅうで閉じてもなくならない）。中身は見た目だけ。
import { T } from '../data/text.js';
import { KOBAN, KINDS } from '../data/fukubako.js';
import { DOHYO } from '../data/dohyo.js';
import { OTEHON } from '../data/cpu-shapes.js';
import { FUKU_ITEMS, fukuOdds, drawFuku, addItem, ownedItems, tierOf, kindName } from '../game/fukubako.js';
import { drawShapeThumb, thumbAuraBox } from './pick.js';
import { auraPreview } from './aura.js';
import { patternFill } from './papertex.js';
import { setupCanvas } from './ink.js';
import { fitText } from './roster.js';
import { playSfx } from './sound.js';

const KIND_ORDER = ['word', 'paper', 'aura', 'dohyo'];
const SHORT = { word: '四股名' };   // 下の帯は短く
const pct = (x) => `${x.toFixed(2)}%`;

// 土俵の小さな見本（上の面・墨の輪・仕切り線と、横の面）
export function drawDohyoSwatch(cv, key) {
  const d = DOHYO[key] || DOHYO.kami;
  const { ctx, W, H } = setupCanvas(cv);
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, rx = W * 0.46, ry = rx * 0.34, top = H * 0.42, side = H * 0.22;
  // 横の面
  ctx.fillStyle = d.side.paper;
  ctx.beginPath(); ctx.moveTo(cx - rx, top); ctx.lineTo(cx - rx, top + side); ctx.ellipse(cx, top + side, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, top); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = d.side.line; ctx.lineWidth = Math.max(1, W * 0.012);
  ctx.beginPath(); ctx.moveTo(cx - rx, top); ctx.lineTo(cx - rx, top + side); ctx.ellipse(cx, top + side, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, top); ctx.stroke();
  // 上の面
  ctx.fillStyle = d.top.pat ? patternFill(ctx, d.top.pat, d.top.paper, d.top.ink || '#201E1B', W * 1.2) : d.top.paper;
  ctx.beginPath(); ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = d.top.ring || '#201E1B'; ctx.lineWidth = Math.max(2, rx * (d.top.ringW || 0.055) * 1.6);
  ctx.beginPath(); ctx.ellipse(cx, top, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = d.top.shikiriInk || '#201E1B'; ctx.lineWidth = Math.max(1.5, W * 0.016);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * rx * 0.16, top - ry * 0.22); ctx.lineTo(cx + s * rx * 0.16, top + ry * 0.22); ctx.stroke(); }
}

// cb：{ getState(), onSave(), getShort() }
export function initFuku(cb) {
  const $ = (id) => document.getElementById(id);
  const box = $('fk-box'), reveal = $('fk-reveal'), openBtn = $('fk-open');
  const cv = $('fk-cv'), auraCv = $('fk-aura'), fxCv = $('fk-fx');
  let busy = false, prev = null, fx = null, timers = [];
  const later = (ms, f) => timers.push(setTimeout(f, ms));
  function stopAll() {
    timers.forEach(clearTimeout); timers = [];
    if (prev) { prev.stop(); prev = null; }
    if (fx) { fx.stop(); fx = null; }
    busy = false;
  }
  function shape(st) { const s = st.slots[st.active]; return s ? s.shape : OTEHON.pts; }
  function paperOf(st) { const s = st.slots[st.active]; return s ? s.paper : null; }

  function paint() {
    const st = cb.getState(), owned = ownedItems(st);
    $('fk-koban').textContent = T.koban(st.koban);
    // 種類ごとの、持っている数／ぜんぶ（そろえても、ごほうびはない＝コンプガチャにしない）
    const kinds = $('fk-kinds');
    kinds.textContent = '';
    for (const k of KIND_ORDER) {
      const all = FUKU_ITEMS.filter((it) => it.kind === k);
      const d = document.createElement('div');
      const b = document.createElement('b');
      b.className = 'brush';
      const n = document.createElement('span');   // 「12／64」：数字は縦中横で
      const num = (x) => { const i = document.createElement('i'); i.textContent = String(x); return i; };
      n.append(num(all.filter((it) => owned.has(it.id)).length), '／', num(all.length));
      d.append(b, n);
      kinds.appendChild(d);
      fitText(b, SHORT[k] || KINDS[k]);
    }
    const left = fukuOdds(owned).left;
    openBtn.disabled = !left || st.koban < KOBAN.price;
    openBtn.textContent = !left ? T.fukuDone : st.koban < KOBAN.price ? T.fukuShort : T.fukuOpen(KOBAN.price);
  }

  function paintReveal(it, st) {
    const tier = tierOf(it.id);
    reveal.dataset.tier = it.tier;
    reveal.dataset.kind = it.kind;
    const h = $('fk-tier');
    h.textContent = tier.name;
    h.style.color = tier.color;
    $('fk-kind').textContent = it.kind === 'word' ? `${kindName('word')}・${it.part === 'kami' ? '上の句' : '下の句'}` : kindName(it.kind);
    $('fk-new').textContent = T.fukuNew;
    fitText($('fk-name'), it.name);
    const ctx = auraCv.getContext('2d');
    ctx.clearRect(0, 0, auraCv.width, auraCv.height);
    if (it.kind === 'paper') drawShapeThumb(cv, shape(st), false, it.id);
    else if (it.kind === 'aura') {
      drawShapeThumb(cv, shape(st), false, paperOf(st));
      prev = auraPreview(auraCv, it.id, thumbAuraBox(auraCv, cv, shape(st)));
    } else if (it.kind === 'dohyo') drawDohyoSwatch(cv, it.id.slice(2));
  }

  function play(it, st) {
    busy = true;
    reveal.hidden = true;
    box.hidden = false;
    box.className = 'fkbox';
    void box.offsetWidth;
    const short = cb.getShort && cb.getShort();
    const t0 = short ? 0 : 900;
    if (!short) {   // ゆれる・太鼓3つ
      box.classList.add('shake');
      [0, 300, 600].forEach((ms, i) => later(ms, () => playSfx('taiko', { vol: 0.45 + i * 0.12, rate: 1 + i * 0.04 })));
    }
    later(t0, () => { box.classList.add('cut'); playSfx('sumi', { vol: 0.7 }); });
    later(t0 + 200, () => { box.classList.add('open'); playSfx('kami', { vol: 0.85 }); });
    later(t0 + 560, () => {
      box.hidden = true;
      reveal.hidden = false;
      reveal.classList.remove('in');
      void reveal.offsetWidth;
      reveal.classList.add('in');
      paintReveal(it, st);
      // 段ごとの音（並・上は「トン」、特上は太鼓の締め、極は拍子木と金の箔）
      if (it.tier === 'kiwami') {
        playSfx('hyoshigi', { vol: 0.9 });
        fx = auraPreview(fxCv, 'a_kin', () => ({ x: fxCv.clientWidth / 2, y: fxCv.clientHeight * 0.45, h: fxCv.clientHeight * 0.9 }));
      } else if (it.tier === 'tokujo') playSfx('taiko-end', { vol: 0.8 });
      else playSfx('ton', { vol: it.tier === 'jo' ? 0.85 : 0.6 });
      busy = false;
    });
  }

  openBtn.addEventListener('click', () => {
    if (busy) return;
    const st = cb.getState();
    const it = st.koban >= KOBAN.price ? drawFuku(ownedItems(st)) : null;
    if (!it) return;
    stopAll();
    st.koban -= KOBAN.price;
    addItem(st, it);
    cb.onSave();
    paint();
    play(it, st);
  });

  // 出る物と確率（買う前に見る）
  const sheet = $('s-odds');
  function paintOdds() {
    const { rows } = fukuOdds(ownedItems(cb.getState()));
    const body = $('od-list');
    body.textContent = '';
    const note = (t) => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); };
    note(T.fukuNote);
    note(T.fukuOddsNote);
    for (const r of rows) {
      const sec = document.createElement('section');
      sec.className = 'odds';
      const h = document.createElement('h2');
      const stamp = document.createElement('i');
      stamp.className = 'hanko brush';
      stamp.textContent = r.tier.name;
      stamp.style.color = r.tier.color;
      const rate = document.createElement('b');
      rate.textContent = pct(r.rate);
      const sub = document.createElement('small');
      sub.textContent = r.items.length ? `${r.items.length}種・1つ ${pct(r.rate / r.items.length)}` : T.fukuDone;
      h.append(stamp, rate, sub);
      sec.appendChild(h);
      // 四股名の語は、上の句と下の句で分けて（同じ字の語が両方にあるため）
      const groups = [['上の句', (it) => it.kind === 'word' && it.part === 'kami'], ['下の句', (it) => it.kind === 'word' && it.part === 'shimo']]
        .concat(KIND_ORDER.slice(1).map((k) => [KINDS[k], (it) => it.kind === k]));
      for (const [label, f] of groups) {
        const its = r.items.filter(f);
        if (!its.length) continue;
        const p = document.createElement('p');
        const kb = document.createElement('b');
        kb.textContent = `${label} ${its.length}`;
        p.append(kb, document.createTextNode(its.map((it) => it.name || T.rollNone).join('・')));
        sec.appendChild(p);
      }
      body.appendChild(sec);
    }
  }
  $('fk-odds').addEventListener('click', () => { paintOdds(); sheet.hidden = false; sheet.querySelector('.body').scrollTop = 0; });
  $('od-close').addEventListener('click', () => { sheet.hidden = true; });

  return {
    show() {
      stopAll();
      sheet.hidden = true;
      box.hidden = false;
      box.className = 'fkbox';
      reveal.hidden = true;
      paint();
    },
  };
}
