// タイトル・相撲部屋（ホーム）・勝負（巡業／本場所／稽古をえらぶ）
import { T } from '../data/text.js';
import { STAGES } from '../data/stages.js';
import { stagesOf, slotIndex } from '../game/jungyo.js';
import { rankOf } from '../game/rating.js';
import { shikonaText, titleText } from '../game/names.js';
import { drawShapeThumb } from './pick.js';

export function initHeya(cb) {
  const on = (id, f) => document.getElementById(id).addEventListener('click', f);
  on('b-start', cb.onStart);
  on('home-mine', cb.onRoster);
  on('m-shobu', cb.onShobu);
  on('m-rikishi', cb.onRoster);
  on('m-banzuke', cb.onBanzuke);
  on('m-jungyo', cb.onJungyo);
  on('mc-jungyo', cb.onJungyoMatch);
  on('mc-honbasho', cb.onHonbasho);
  on('mc-keiko', cb.onKeiko);

  return {
    // 部屋：いま選んでいる力士（称号・四股名・番付）
    home(st) {
      const s = st.slots[st.active];
      const el = document.getElementById('home-mine');
      const cv = el.querySelector('canvas');
      cv.hidden = !s;
      el.querySelector('small').textContent = s ? titleText(s.title) : '';
      el.querySelector('b').textContent = s ? shikonaText(s.shikona) : T.needRikishi;
      el.querySelector('em').textContent = T.rateLine(rankOf(st.rate).name, st.rate);
      if (s) drawShapeThumb(cv, s.shape);
    },
    mode(st) {
      document.getElementById('mc-jungyo-now').textContent = stagesOf(slotIndex(Date.now())).map((id) => STAGES[id].name).join('・');
      document.getElementById('mc-hon-now').textContent = T.rateLine(rankOf(st.rate).name, st.rate);
    },
  };
}
