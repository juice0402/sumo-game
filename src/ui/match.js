// 巡業（土俵巡業の予定）・番付（本場所）・力士選出の画面
import { T } from '../data/text.js';
import { STAGES } from '../data/stages.js';
import { DOHYO } from '../data/dohyo.js';
import { PHYS } from '../data/config.js';
import { drawDohyoSwatch } from './fuku.js';
import { loadDohyoTextures, texImage } from './papertex.js';
import { BANZUKE } from '../data/banzuke.js';
import { schedule, slotLeftMin } from '../game/jungyo.js';
import { rankOf, nextRank } from '../game/rating.js';
import { renderSlots, headText, fitText, setN, sameSize } from './roster.js';

function hhmm(ms) { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; }

// 土俵の小さな見本（土俵の絵）＋名前
function stageCard(id, big) {
  const S = STAGES[id];
  const el = document.createElement('div');
  el.className = 'stagecard' + (big ? ' big' : '');
  // 土俵の見本は、土俵えらび・福箱と同じ絵の見本（Codex の上の面と横の帯・11/28 しょーくん「開催中の土俵のアイコンが新しいテクスチャになってない」）
  el.innerHTML = '<canvas class="sw"></canvas><b class="brush"></b><span></span>';
  const sw = el.querySelector('.sw');
  const draw = () => drawDohyoSwatch(sw, S.look, Object.assign({}, PHYS, S.phys));   // 狭小土俵は箱の形も
  requestAnimationFrame(draw);   // 画面に入って大きさが決まってから描く
  if (DOHYO[S.look] && DOHYO[S.look].top.img && !texImage(DOHYO[S.look].top.img)) loadDohyoTextures([S.look]).then(() => requestAnimationFrame(draw));   // 巡業の土俵の絵は、読めたら描きなおす
  fitText(el.querySelector('b'), S.name);
  el.querySelector('span').textContent = S.note;
  setN(el.querySelector('span'));
  return el;
}

export function initJungyo() {
  return {
    show() {
      const now = Date.now();
      const list = schedule(now);
      document.getElementById('jg-left').textContent = T.jungyoLeft(slotLeftMin(now));
      const cur = document.getElementById('jg-now');
      cur.textContent = '';
      for (const id of list[0].stages) cur.appendChild(stageCard(id, true));
      const box = document.getElementById('jg-list');
      box.textContent = '';
      for (const s of list.slice(1)) {
        const row = document.createElement('div');
        row.className = 'srow';
        const t = document.createElement('em');
        t.textContent = hhmm(s.start) + '〜';
        row.appendChild(t);
        for (const id of s.stages) { const n = document.createElement('span'); n.textContent = STAGES[id].name; row.appendChild(n); }
        box.appendChild(row);
      }
    },
  };
}

export function initBanzuke() {
  return {
    // st：保存の中身（rate・hon）／title：見出し（番付 or 本場所）
    show(st, title) {
      headText(document.getElementById('bz-h'), title);
      const r = rankOf(st.rate), nx = nextRank(st.rate);
      fitText(document.getElementById('bz-rank'), r.name);
      document.getElementById('bz-rate').textContent = String(st.rate);
      document.getElementById('bz-rec').textContent = T.mode.honbasho + ' ' + T.rec(st.hon);
      document.getElementById('bz-next').textContent = nx ? T.toNext(nx.name, nx.min - st.rate) : T.top;
      const ol = document.getElementById('bz-ladder');
      ol.textContent = '';
      for (const b of BANZUKE.slice().reverse()) {
        const li = document.createElement('li');
        if (b.id === r.id) li.className = 'on';
        const n = document.createElement('b');
        n.className = 'brush';
        n.textContent = b.name;
        const m = document.createElement('span');
        m.textContent = Number.isFinite(b.min) ? String(b.min) : '';
        li.append(n, m);
        ol.appendChild(li);
      }
      document.getElementById('bz-world').textContent = T.worldLater;
    },
  };
}

// 土俵えらび（本場所の土俵スキン）：o：{ own（持っている土俵の key）, cur（いまの key）, onPick(key, ボタン) }
const dohyoLabel = (key) => DOHYO[key].name.replace(/の(土俵|箱)$/, '');
export function initDohyoPick() {
  return {
    show(o) {
      document.getElementById('dy-name').textContent = DOHYO[o.cur].name;
      setN(document.getElementById('dy-name'));
      const list = document.getElementById('dy-list');
      list.textContent = '';
      for (const key of o.own) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = key === o.cur ? 'on' : '';
        b.innerHTML = '<b class="brush fit"></b><canvas></canvas>';
        b.querySelector('b').textContent = dohyoLabel(key);
        b.addEventListener('click', () => o.onPick(key, b));
        list.appendChild(b);
      }
      sameSize(list.querySelectorAll('b'));
      // 絵はならべてから（大きさが決まってから）
      drawDohyoSwatch(document.getElementById('dy-cv'), o.cur);
      list.querySelectorAll('canvas').forEach((cv, i) => drawDohyoSwatch(cv, o.own[i]));
    },
  };
}

export function initSelect() {
  return {
    // o：{ mode, stage, drawn（抽選したか）, slots, active, rec（部屋の番付・レート・勝敗のひとこと）, onPick(i) }
    show(o) {
      document.getElementById('sel-mode').textContent = T.mode[o.mode];
      setN(document.getElementById('sel-mode'));
      const S = STAGES[o.stage];
      document.getElementById('sel-stage').textContent = o.drawn ? T.jungyoDraw(S.name) + '・' + S.note : T.stageLine(S.name, S.note);
      setN(document.getElementById('sel-stage'));
      const rec = document.getElementById('sel-rec');
      rec.textContent = o.rec || '';
      setN(rec);
      renderSlots(document.getElementById('sel-slots'), o.slots, { active: o.active, onPick: o.onPick, emptyOk: false });
    },
  };
}
