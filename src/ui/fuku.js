// 福箱の画面（11/26 しょーくん）：小判で買って開ける・出る物と確率の一覧。
// 開け方は「金の漆の箱がゆれる（太鼓）→ 紫の組紐がしゅるっとほどける → ふたが浮いて抜ける → 中身」（11/26・箱は ui/fukubox.js）。スロットやパチンコには似せない（game-art-rule.md）
// 中身は札で見せる（11/27・ui/fukureveal.js）：札が舞い上がってくるっと表へ → 名前を筆で → 段の判子をドン。段が上がるほど飾りを足す
// 引いた物は、動きの前に保存する（とちゅうで閉じてもなくならない）。中身は見た目だけ。
import { T } from '../data/text.js';
import { KOBAN, KINDS } from '../data/fukubako.js';
import { DOHYO } from '../data/dohyo.js';
import { PHYS } from '../data/config.js';
import { OTEHON } from '../data/cpu-shapes.js';
import { fukuOdds, drawFuku, addItem, ownedItems, tierOf, kindName } from '../game/fukubako.js';
import { drawShapeThumb, thumbAuraBox } from './pick.js';
import { auraPreview } from './aura.js';
import { patternFill, texImage } from './papertex.js';
import { setupCanvas } from './ink.js';
import { fitText } from './roster.js';
import { playSfx } from './sound.js';
import { createFukuBox } from './fukubox.js';
import { createReveal, REVEAL_TIME } from './fukureveal.js';

const KIND_ORDER = ['word', 'title', 'paper', 'aura', 'dohyo'];
const pct = (x) => `${x.toFixed(2)}%`;

// 土俵の小さな見本（上の面・墨の輪・仕切り線と、横の面）
export function drawDohyoSwatch(cv, key) {
  const d = DOHYO[key] || DOHYO.kami;
  const { ctx, W, H } = setupCanvas(cv);
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, rx = W * 0.46, ry = rx * 0.34, top = H * 0.42, side = H * 0.22;
  const topImg = texImage(d.top.img), sideImg = texImage(d.side.img);   // 土俵スキンの絵（Codex）があれば絵で
  // 横の面
  ctx.fillStyle = d.side.paper;
  ctx.beginPath(); ctx.moveTo(cx - rx, top); ctx.lineTo(cx - rx, top + side); ctx.ellipse(cx, top + side, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, top); ctx.closePath(); ctx.fill();
  if (sideImg) { ctx.save(); ctx.clip(); ctx.drawImage(sideImg, cx - rx, top, 2 * rx, side + ry); ctx.restore(); }   // 横の面いっぱいに（上の面のふちまで・すきまを作らない）
  ctx.strokeStyle = d.side.line; ctx.lineWidth = Math.max(1, W * 0.012);
  ctx.beginPath(); ctx.moveTo(cx - rx, top); ctx.lineTo(cx - rx, top + side); ctx.ellipse(cx, top + side, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, top); ctx.stroke();
  // 上の面
  ctx.fillStyle = d.top.pat ? patternFill(ctx, d.top.pat, d.top.paper, d.top.ink || '#201E1B', W * 1.2) : d.top.paper;
  ctx.beginPath(); ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  if (topImg) { ctx.save(); ctx.clip(); ctx.drawImage(topImg, cx - rx, top - ry, 2 * rx, 2 * ry); ctx.restore(); }   // 真上の1枚絵を、ななめから見た楕円につぶす
  ctx.beginPath(); ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  // 輪は取組の土俵と同じ所：輪の外がわ＝俵の線（PHYS.tawara）・太さも同じ割合（ui/stage3d.js の topCanvas）
  const lw = Math.max(2, rx * (d.top.ringW || 0.055) * 1.2), rr = PHYS.tawara / PHYS.ringHalf - lw / 2 / rx;
  ctx.strokeStyle = d.top.ring || '#201E1B'; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(cx, top, rx * rr, ry * rr, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = d.top.shikiriInk || '#201E1B'; ctx.lineWidth = Math.max(1.5, W * 0.016);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * rx * 0.16, top - ry * 0.22); ctx.lineTo(cx + s * rx * 0.16, top + ry * 0.22); ctx.stroke(); }
}

// cb：{ getState(), onSave(), getShort() }
export function initFuku(cb) {
  const $ = (id) => document.getElementById(id);
  const box = $('fk-box'), reveal = $('fk-reveal'), openBtn = $('fk-open');
  const cv = $('fk-cv'), auraCv = $('fk-aura'), fxCv = $('fk-fx');
  const fbox = createFukuBox(box);
  const hero = $('fk-hero'), rv = createReveal({ hero, card: $('fk-card'), back: $('fk-back'), front: $('fk-front') });
  let busy = false, prev = null, fx = null, timers = [];
  const later = (ms, f) => timers.push(setTimeout(f, ms));
  function stopAll() {
    timers.forEach(clearTimeout); timers = [];
    if (prev) { prev.stop(); prev = null; }
    if (fx) { fx.stop(); fx = null; }
    fbox.stop();
    rv.stop();
    reveal.classList.remove('in');
    busy = false;
  }
  function shape(st) { const s = st.slots[st.active]; return s ? s.shape : OTEHON.pts; }
  function paperOf(st) { const s = st.slots[st.active]; return s ? s.paper : null; }

  function paint() {
    const st = cb.getState(), owned = ownedItems(st);
    $('fk-koban').textContent = T.koban(st.koban);
    // 福箱の画面は、箱と「出る物と確率」「開ける」だけ（持っている数・ぜんぶの数は出さない＝開けてのおたのしみ・11/26 しょーくん）
    const left = fukuOdds(owned).left;
    openBtn.disabled = !left || st.koban < KOBAN.price;
    openBtn.textContent = !left ? T.fukuDone : st.koban < KOBAN.price ? T.fukuShort : T.fukuOpen(KOBAN.price);
  }

  function paintReveal(it, st) {
    const tier = tierOf(it.id);
    reveal.dataset.tier = it.tier;
    reveal.dataset.kind = it.kind;
    $('fk-tier').textContent = tier.name;   // 判子の色は札の段で（style.css の --stamp）
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
    const short = (cb.getShort && cb.getShort()) || matchMedia('(prefers-reduced-motion: reduce)').matches;
    rv.load();   // 札の紙・紙吹雪・金雲の絵を、箱が開くあいだに用意
    const { P, done } = fbox.play(short);
    if (!short) [0, 300, 600].forEach((ms, i) => later(ms, () => playSfx('taiko', { vol: 0.45 + i * 0.12, rate: 1 + i * 0.04 })));   // ゆれる・太鼓3つ
    later(P.p0, () => playSfx('kami', { vol: 0.7, rate: 1.15 }));   // 紐がしゅるっ
    later(P.l0, () => playSfx('sumi', { vol: 0.6 }));               // ふたが抜ける
    done.then(() => {
      if (!busy) return;
      reveal.hidden = false;   // 箱はうすれながら、煙と金箔がうしろに少し残る（ui/fukubox.js）
      reveal.classList.remove('in');
      paintReveal(it, st);     // 動きの前に描く（札が小さい・裏返しのあいだに描くと、見本の絵があらくなる）
      void reveal.offsetWidth;
      reveal.classList.add('in');
      rv.play(it.tier, short);   // 札・判子・段ごとの飾りと音
      // 極は、判子のあと札のまわりに金の気
      if (it.tier === 'kiwami') later((short ? REVEAL_TIME.short : REVEAL_TIME.full).stamp, () => {
        fx = auraPreview(fxCv, 'a_kin', () => { const b = rv.cardBox(); return { x: b.x + b.w / 2, y: b.y + b.h * 0.55, h: b.h * 1.05 }; });
      });
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
      // 種類ごとの数と確率だけ（名前は出さない＝何が入っているかは開けてのおたのしみ・11/26 しょーくん）
      for (const k of KIND_ORDER) {
        const n = r.items.filter((it) => it.kind === k).length;
        if (!n) continue;
        const p = document.createElement('p');
        const kb = document.createElement('b');
        kb.textContent = `${KINDS[k]} ${n}`;
        p.append(kb, document.createTextNode(pct((r.rate * n) / r.items.length)));
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
      reveal.hidden = true;
      fbox.idle();
      paint();
    },
  };
}
