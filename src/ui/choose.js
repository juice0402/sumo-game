// えらんだ瞬間の動き（11/26 しょーくん）：相撲部屋と勝負のメニュー。
// えらんだ列に朱の筆の帯をベタッと（ド）→ もう一度ぐっと（ドン）→ ほかの列は下へ抜けて消える（11/26 ぜんぶ下へ）→ 次の画面へ。
// 見た目は style.css の「えらんだ瞬間」。もとにもどすのは、画面を開くとき（app.js の enter が reset をよぶ）
import { playSfx } from './sound.js';

export const DON_VOL = 0.37;   // えらんだときのドンの大きさ（決定のボタンも同じ・app.js）

const HIT2 = 120;      // ド → ドン の間（ms）
const LEAVE_AT = 190;  // ほかの列がすべりだす
const STAGGER = 45;    // 1列ごとのずれ
const LEAVE_MS = 280;  // すべって消える長さ
let busy = false;

const reduced = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};

// btn：えらんだボタン（.cols の子）。then：次の画面へ。short：演出を短く
export function choose(btn, then, short) {
  if (busy) return;
  busy = true;
  const list = btn.parentElement, items = [...list.children], k = items.indexOf(btn);
  const done = () => {
    busy = false;
    then();
    if (!list.closest('.screen').hidden) reset(list);   // 画面が変わらなかったら、すぐもとへ
  };
  btn.classList.add('chosen');
  playSfx('don', { vol: DON_VOL });   // 和太鼓のドン（11/26 しょーくん「選択肢を選んだときは和太鼓のドン」）
  if (short || reduced()) { setTimeout(done, 170); return; }
  setTimeout(() => btn.classList.add('chosen2'), HIT2);
  // ほかの列は下へ抜ける。えらんだ列に近いものから
  let n = 0;
  items.forEach((c, i) => {
    if (i === k) return;
    c.style.setProperty('--d', `${Math.abs(i - k) * STAGGER - STAGGER}ms`);
    c.classList.add('leave-d');
    n = Math.max(n, Math.abs(i - k));
  });
  list.classList.add('leaving');
  setTimeout(done, LEAVE_AT + (n - 1) * STAGGER + LEAVE_MS);
}

export function reset(root) {
  for (const c of root.querySelectorAll('.chosen, .leave-d, .leaving')) {
    c.classList.remove('chosen', 'chosen2', 'leave-d', 'leaving');
    c.style.removeProperty('--d');
  }
}
