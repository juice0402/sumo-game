// 部屋の力士（3枠）・力士の編集（四股名・称号はくるくる回して選ぶ・切り直す・引退）
import { T } from '../data/text.js';
import { SHIKONA } from '../data/shikona.js';
import { TITLES } from '../data/titles.js';
import { shikonaText, titleText, wordText, randomShikona } from '../game/names.js';
import { drawShapeThumb } from './pick.js';
import { createRoller } from './roller.js';

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

// ドラムに並べる語。has：持っている語（Set）。えらべるのはその中だけ（11/26：ほかの語は、あとで手に入れる）
function itemsOf(g, has) {
  if (g === 'title') return TITLES.map((t) => ({ id: t.id, label: t.t }));
  return SHIKONA[g].filter((w) => has.has(w.id)).map((w) => ({ id: w.id, label: wordText(w.id) || T.rollNone }));
}

// 力士の編集。cb：{ getSlot(i), getOwned()＝持っている語の Set, onChange(i), onRecut(i), onRetire(i), onDone() }
export function initEdit(cb) {
  const cv = document.getElementById('ed-cv');
  let idx = 0, saveT = 0;
  const G = { kami: 0, tsunagi: 1, shimo: 2 };

  function paintName() {
    const s = cb.getSlot(idx);
    if (!s) return;
    document.getElementById('ed-title').textContent = titleText(s.title);
    fitText(document.getElementById('ed-name'), shikonaText(s.shikona));
    document.getElementById('ed-rec').textContent = T.rec(s.rec);
  }
  // まわしている間は名前だけ描きなおし、保存は止まってから
  const saveLater = () => { clearTimeout(saveT); saveT = setTimeout(() => cb.onChange(idx), 300); };

  const rollers = {};
  for (const col of document.querySelectorAll('#ed-roller .rl-col')) {
    const g = col.dataset.g;
    rollers[g] = createRoller(col, (id) => {
      const s = cb.getSlot(idx);
      if (!s) return;
      if (g === 'title') s.title = id; else s.shikona[G[g]] = id;
      paintName();
      saveLater();
    });
  }
  function setRollers() {
    const s = cb.getSlot(idx), has = cb.getOwned();
    for (const g in rollers) rollers[g].set(itemsOf(g, has), g === 'title' ? s.title : s.shikona[G[g]]);
    const locked = SHIKONA.kami.filter((w) => !has.has(w.id)).length + SHIKONA.shimo.filter((w) => !has.has(w.id)).length;
    document.getElementById('ed-locked').textContent = locked ? T.lockedWords(locked) : '';
  }

  // おまかせ：3つのドラムがスロットのようにまわって止まる
  document.getElementById('ed-rand').addEventListener('click', () => {
    const s = cb.getSlot(idx);
    s.shikona = randomShikona(Math.random, cb.getOwned());
    rollers.kami.roll(s.shikona[0]);
    rollers.tsunagi.roll(s.shikona[1]);
    rollers.shimo.roll(s.shikona[2]);
    paintName();
    cb.onChange(idx);
  });
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
      drawShapeThumb(cv, cb.getSlot(i).shape);
      setRollers();
    },
  };
}
