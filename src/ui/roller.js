// くるくる回して選ぶドラム（力士の編集の 称号・上の句・つなぎ・下の句。11/26 しょーくん「スプラの二つ名みたいにロールして選べる」）。
// 1列＝たての一覧。指でまわすと真ん中の行に止まる（CSS の scroll-snap）。まわしている間も、真ん中の語がそのまま名前に入る。
// 上下の行をタップすると、その語が真ん中へ。見た目は style.css の「くるくる」
import { playSfx } from './sound.js';

// col：.rl-col（中に .rl-list）。onPick(id)：真ん中の語が変わった（指でまわしたときだけ）
export function createRoller(col, onPick) {
  const list = col.querySelector('.rl-list');
  let items = [], idx = 0, silent = false, quietT = 0;
  const row = () => list.firstElementChild ? list.firstElementChild.offsetHeight : 34;

  function paint() {
    const kids = list.children;
    for (let i = 0; i < kids.length; i++) {
      const d = i - idx < 0 ? idx - i : i - idx;
      kids[i].className = 'rl-item' + (d === 0 ? ' sel' : d === 1 ? ' n1' : d === 2 ? ' n2' : '');
    }
  }
  // 字の多い語（称号の8字 など）は、列の幅に収まる大きさに
  function fit() {
    const w = list.clientWidth;
    for (const el of list.children) {
      const n = Array.from(el.textContent).length;
      el.style.setProperty('--fit', `${Math.min(20, Math.floor((w * 0.9) / Math.max(1, n)))}px`);
    }
  }
  function settleLater() {   // 動きが止まったら、プログラムでまわした分の「だまって」を解く
    clearTimeout(quietT);
    quietT = setTimeout(() => { silent = false; }, 160);
  }
  list.addEventListener('scroll', () => {
    const r = row();
    let i = Math.round(list.scrollTop / r);
    if (i < 0) i = 0;
    if (i > items.length - 1) i = items.length - 1;
    if (i !== idx) {
      idx = i;
      paint();
      playSfx('ton', { vol: 0.1, rate: 2.3 });   // カチッ
      if (!silent) onPick(items[i].id);
    }
    if (silent) settleLater();
  }, { passive: true });
  list.addEventListener('click', (e) => {
    const el = e.target.closest('.rl-item');
    if (!el) return;
    const i = Array.prototype.indexOf.call(list.children, el);
    list.scrollTo({ top: i * row(), behavior: 'smooth' });
  });

  return {
    // items：[{ id, label }]・cur：いまの id・roll：true ならスロットのようにまわって止まる（おまかせ）
    set(newItems, cur) {
      items = newItems;
      list.textContent = '';
      for (const it of items) {
        const el = document.createElement('div');
        el.className = 'rl-item';
        el.textContent = it.label;
        list.appendChild(el);
      }
      idx = Math.max(0, items.findIndex((x) => x.id === cur));
      paint();
      fit();
      silent = true;
      list.scrollTop = idx * row();
      settleLater();
    },
    roll(cur) {
      const i = items.findIndex((x) => x.id === cur);
      if (i < 0) return;
      silent = true;
      list.scrollTo({ top: i * row(), behavior: 'smooth' });
      settleLater();
    },
  };
}
