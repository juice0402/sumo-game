// 巡業（土俵巡業の予定）・番付（本場所）・力士選出の画面
import { T } from '../data/text.js';
import { STAGES } from '../data/stages.js';
import { DOHYO } from '../data/dohyo.js';
import { BANZUKE } from '../data/banzuke.js';
import { schedule, slotLeftMin } from '../game/jungyo.js';
import { rankOf, nextRank } from '../game/rating.js';
import { renderSlots } from './roster.js';

function hhmm(ms) { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; }

// 土俵の小さな見本（上の面の和紙と輪・横の厚紙の色）＋名前
function stageCard(id, big) {
  const S = STAGES[id], d = DOHYO[S.look];
  const el = document.createElement('div');
  el.className = 'stagecard' + (big ? ' big' : '');
  el.innerHTML = '<i class="sw"><i></i></i><b class="brush"></b><span></span>';
  const sw = el.querySelector('.sw');
  sw.style.setProperty('--top', d.top.paper);
  sw.style.setProperty('--ring', d.top.ring);
  sw.style.setProperty('--side', d.side.paper);
  el.querySelector('b').textContent = S.name;
  el.querySelector('span').textContent = S.note;
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
      document.getElementById('bz-h').textContent = title;
      const r = rankOf(st.rate), nx = nextRank(st.rate);
      document.getElementById('bz-rank').textContent = r.name;
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

export function initSelect() {
  return {
    // o：{ mode, stage, drawn（抽選したか）, slots, active, onPick(i) }
    show(o) {
      document.getElementById('sel-mode').textContent = T.mode[o.mode];
      const S = STAGES[o.stage];
      document.getElementById('sel-stage').textContent = o.drawn ? T.jungyoDraw(S.name) + '・' + S.note : T.stageLine(S.name, S.note);
      renderSlots(document.getElementById('sel-slots'), o.slots, { active: o.active, onPick: o.onPick, emptyOk: false });
    },
  };
}
