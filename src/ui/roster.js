// 部屋の力士（3枠）・力士の編集（四股名・称号・切り直す・引退）・語をえらぶシート
import { T } from '../data/text.js';
import { SHIKONA, SHIKONA_CATS } from '../data/shikona.js';
import { TITLES } from '../data/titles.js';
import { shikonaText, titleText, wordLabel, randomShikona } from '../game/names.js';
import { drawShapeThumb } from './pick.js';

// 縦書きの名前：字の数を --n に入れて、列の高さに収まる大きさにする（CSS の font-size が --n を使う）
export function fitText(el, text) {
  el.textContent = text;
  el.style.setProperty('--n', String(Math.max(2, Array.from(text).length)));
  el.classList.add('fit');
}

// 力士のカード（部屋の力士・力士選出で使う）。番付表の1列＝1力士。opt：{ active, onPick(i), emptyOk }
export function renderSlots(el, slots, opt) {
  el.textContent = '';
  slots.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot' + (s ? '' : ' empty') + (s && i === opt.active ? ' on' : '');
    if (!s && !opt.emptyOk) b.disabled = true;
    if (s) {
      b.innerHTML = '<canvas></canvas><span class="who"><small></small><b class="brush"></b><em></em></span>';
      b.querySelector('small').textContent = titleText(s.title);
      fitText(b.querySelector('b'), shikonaText(s.shikona));
      b.querySelector('em').textContent = T.rec(s.rec);
    } else {
      b.innerHTML = '<span class="plus brush">＋</span><span class="who"><b class="brush"></b><em></em></span>';
      fitText(b.querySelector('b'), T.slotEmpty);
      b.querySelector('em').textContent = opt.emptyOk ? T.slotCut : '';
    }
    b.addEventListener('click', () => opt.onPick(i));
    el.appendChild(b);
  });
  // 描くのはならべてから（canvas の大きさが決まってから）
  slots.forEach((s, i) => { if (s) drawShapeThumb(el.children[i].querySelector('canvas'), s.shape); });
}

// 語をえらぶシート：groups＝[{ title, items:[{id, label}] }]・note：いちばん下のひとこと
function initWordSheet() {
  const sheet = document.getElementById('s-words');
  const list = document.getElementById('w-list');
  let onPick = null;
  document.getElementById('w-close').addEventListener('click', () => { sheet.hidden = true; });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b || !onPick) return;
    sheet.hidden = true;
    onPick(b.dataset.id);
  });
  return {
    open(title, groups, current, pick, note = '') {
      onPick = pick;
      document.getElementById('w-title').textContent = title;
      list.textContent = '';
      for (const g of groups) {
        if (g.title) { const h = document.createElement('h2'); h.textContent = g.title; list.appendChild(h); }
        const grid = document.createElement('div');
        grid.className = 'words';
        for (const it of g.items) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'ghost';
          b.dataset.id = it.id;
          b.textContent = it.label;
          b.setAttribute('aria-pressed', String(it.id === current));
          grid.appendChild(b);
        }
        list.appendChild(grid);
      }
      if (note) { const p = document.createElement('p'); p.className = 'locked'; p.textContent = note; list.appendChild(p); }
      sheet.hidden = false;
      list.scrollTop = 0;
    },
  };
}

// has：持っている語（Set）。えらべるのはその中だけ（11/26：ほかの語は、あとで手に入れる）
function groupsOf(g, has) {
  if (g === 'title') return [{ title: '', items: TITLES.map((t) => ({ id: t.id, label: t.t })) }];
  const by = {};
  for (const w of SHIKONA[g]) if (has.has(w.id)) (by[w.cat] = by[w.cat] || []).push({ id: w.id, label: wordLabel(w.id) });
  return Object.keys(by).map((c) => ({ title: g === 'tsunagi' ? '' : SHIKONA_CATS[c], items: by[c] }));
}

// 力士の編集。cb：{ getSlot(i), getOwned()＝持っている語の Set, onChange(i), onRecut(i), onRetire(i), onDone() }
export function initEdit(cb) {
  const words = initWordSheet();
  const cv = document.getElementById('ed-cv');
  let idx = 0;
  const G = { kami: 0, tsunagi: 1, shimo: 2 };

  function paint() {
    const s = cb.getSlot(idx);
    if (!s) return;
    document.getElementById('ed-title').textContent = titleText(s.title);
    fitText(document.getElementById('ed-name'), shikonaText(s.shikona));
    document.getElementById('ed-rec').textContent = T.rec(s.rec);
    for (const b of document.querySelectorAll('#s-edit .word')) {
      const g = b.dataset.g;
      fitText(b.querySelector('b'), g === 'title' ? titleText(s.title) : wordLabel(s.shikona[G[g]]));
    }
    drawShapeThumb(cv, s.shape);
  }

  for (const b of document.querySelectorAll('#s-edit .word')) {
    b.addEventListener('click', () => {
      const s = cb.getSlot(idx), g = b.dataset.g;
      const cur = g === 'title' ? s.title : s.shikona[G[g]];
      const has = cb.getOwned();
      const locked = g === 'title' ? 0 : SHIKONA[g].filter((w) => !has.has(w.id)).length;
      words.open(T.pickTitle(T.pick[g]), groupsOf(g, has), cur, (id) => {
        if (g === 'title') s.title = id; else s.shikona[G[g]] = id;
        cb.onChange(idx);
        paint();
      }, locked ? T.lockedWords(locked) : '');
    });
  }
  document.getElementById('ed-rand').addEventListener('click', () => {
    const s = cb.getSlot(idx);
    s.shikona = randomShikona(Math.random, cb.getOwned());
    cb.onChange(idx);
    paint();
  });
  document.getElementById('ed-recut').addEventListener('click', () => cb.onRecut(idx));
  document.getElementById('ed-done').addEventListener('click', () => cb.onDone());
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

  return { show(i) { idx = i; disarm(); paint(); } };
}
