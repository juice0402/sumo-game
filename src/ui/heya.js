// タイトル・相撲部屋（ホーム）・勝負（巡業／本場所／稽古をえらぶ）
import { T } from '../data/text.js';
import { STAGES } from '../data/stages.js';
import { stagesOf, slotIndex } from '../game/jungyo.js';
import { rankOf } from '../game/rating.js';
import { shikonaText, titleText } from '../game/names.js';
import { drawShapeThumb, thumbAuraBox } from './pick.js';
import { auraPreview } from './aura.js';
import { fitText } from './roster.js';
import { choose } from './choose.js';

export function initHeya(cb) {
  const on = (id, f) => document.getElementById(id).addEventListener('click', f);
  on('b-start', cb.onStart);
  on('home-mine', cb.onRoster);
  // メニューは、えらんだ列に朱の帯をベタッと＋太鼓「ドドン」→ ほかは消える → 次へ（choose.js）。
  // 番付は本場所の中で見るので、部屋のメニューには置かない（11/26 しょーくん）
  const pickOn = (id, f) => { const b = document.getElementById(id); b.addEventListener('click', () => choose(b, f, cb.getShort && cb.getShort())); };
  pickOn('m-shobu', cb.onShobu);
  pickOn('m-rikishi', cb.onRoster);
  pickOn('m-fuku', cb.onFuku);   // 福箱（11/26）
  pickOn('m-settei', cb.onSettei);   // 設定（11/28）。「帳面」（#28）はこの上に足す
  pickOn('mc-jungyo', cb.onJungyoMatch);
  pickOn('mc-honbasho', cb.onHonbasho);
  pickOn('mc-keiko', cb.onKeiko);

  // 部屋の自作力士は、ときどきぴょこっと跳ねる（たまに2回）。部屋を開いている間だけ
  const homeEl = document.getElementById('s-home'), mineCv = document.querySelector('#home-mine canvas:not(.aura-cv)');
  let hopT = 0;
  const hopLater = (ms) => {
    clearTimeout(hopT);
    hopT = setTimeout(() => {
      if (homeEl.hidden) return;
      if (!mineCv.hidden && !document.hidden) {
        mineCv.classList.remove('hop', 'hop2');
        void mineCv.offsetWidth;   // 動きを最初から
        mineCv.classList.add(Math.random() < 0.25 ? 'hop2' : 'hop');
      }
      hopLater(2400 + Math.random() * 2800);
    }, ms);
  };
  mineCv.addEventListener('animationend', () => mineCv.classList.remove('hop', 'hop2'));

  // 部屋の力士のまわりの気（福箱で手に入れたもの）。部屋を開いている間だけまわす
  const auraCv = document.querySelector('#home-mine .aura-cv');
  let aura = null;

  return {
    // 部屋：いま選んでいる力士（称号・四股名・番付）
    home(st) {
      const s = st.slots[st.active];
      document.getElementById('s-home').classList.toggle('fresh', !s);   // まだ力士がいない：「力士をつくる」だけ朱で
      const el = document.getElementById('home-mine');
      const cv = mineCv;
      document.getElementById('home-koban').textContent = T.koban(st.koban);
      cv.hidden = !s;
      el.querySelector('small').textContent = s ? titleText(s.title) : '';
      fitText(el.querySelector('b'), s ? shikonaText(s.shikona) : T.needRikishi);
      el.querySelector('em').textContent = s ? T.rateLine(rankOf(st.rate).name, st.rate) : '';
      if (s) drawShapeThumb(cv, s.shape, false, s.paper);
      if (aura) aura.stop();
      aura = s ? auraPreview(auraCv, s.aura, thumbAuraBox(auraCv, cv, s.shape)) : null;
      hopLater(1300);   // 画面が入りきったころに最初の1回
    },
    mode(st) {
      document.getElementById('mc-jungyo-now').textContent = stagesOf(slotIndex(Date.now())).map((id) => STAGES[id].name).join('・');
      document.getElementById('mc-hon-now').textContent = T.rateLine(rankOf(st.rate).name, st.rate);
    },
  };
}
