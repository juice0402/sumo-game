// 設定（11/28・issue #27）：音の大きさ（3段）・演出を短く・権利表記（全文は別のシート）・データを消す（2回たしかめる）
import { T } from '../data/text.js';
import { VOL, WIPE_WAIT } from '../data/settings.js';
import { setVolume, playSfx } from './sound.js';

// c：{ state, save, onWipe }
export function initSettei(c) {
  const { state } = c;
  const $ = (id) => document.getElementById(id);
  const applyVol = () => setVolume(VOL[state.vol]);
  applyVol();

  // 切りかえ（えらんだ物に朱の帯・.seg）
  function seg(el, words, get, set) {
    const bs = [...el.querySelectorAll('button')];
    bs.forEach((b, i) => { b.textContent = words[i]; });
    const paint = () => bs.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === get())));
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || Number(b.dataset.v) === get()) return;
      set(Number(b.dataset.v));
      paint();
      c.save();
    });
    return paint;
  }
  const paintVol = seg($('st-vol'), T.vol, () => state.vol, (v) => {
    state.vol = v;
    applyVol();
    playSfx('ton', { vol: 0.75 });   // いまの大きさを聞かせる
  });
  const paintShort = seg($('st-short'), T.shortOpt, () => (state.short ? 1 : 0), (v) => { state.short = v === 1; });

  // データを消す：押すたびに「ほんとうに消す？」→「もう一度で消す」→ 消す。WIPE_WAIT 秒たつか画面を出なおすと最初にもどる
  const wipeBtn = $('st-wipe');
  let step = 0, timer = 0;
  const paintWipe = () => {
    wipeBtn.textContent = T.wipe[step];
    wipeBtn.setAttribute('aria-pressed', String(step > 0));
  };
  const resetWipe = () => { clearTimeout(timer); step = 0; paintWipe(); };
  wipeBtn.addEventListener('click', () => {
    clearTimeout(timer);
    if (step < T.wipe.length - 1) {
      step++;
      paintWipe();
      timer = setTimeout(resetWipe, WIPE_WAIT * 1000);
      return;
    }
    resetWipe();
    c.onWipe();
  });

  // 権利表記と、ライセンスの全文（assets/ の licenses を読む。index.html を軽くするため・ネットの外は読まない）
  const rights = $('s-rights'), lic = $('s-license');
  let rightsDone = false, licText = null;
  $('st-rights').addEventListener('click', () => {
    if (!rightsDone) {
      rightsDone = true;
      const list = $('rt-list');
      for (const [name, use, license] of T.rights) {
        const p = document.createElement('p');
        const b = document.createElement('b');
        b.className = 'brush';
        b.textContent = name;
        const s = document.createElement('span');
        s.textContent = `${use}・${license}`;
        p.append(b, s);
        list.appendChild(p);
      }
      $('rt-cred').textContent = (T.credits || []).join('\n');
    }
    rights.hidden = false;
  });
  $('rt-close').addEventListener('click', () => { rights.hidden = true; });
  $('rt-full').addEventListener('click', () => {
    lic.hidden = false;
    const pre = $('li-text');
    if (licText) return;
    pre.textContent = T.licenseLoading;
    const url = window.SUMO_ASSETS && window.SUMO_ASSETS.licenses;
    (url ? fetch(url).then((r) => { if (!r.ok && r.status !== 0) throw new Error(r.status); return r.text(); }) : Promise.reject(new Error('no')))
      .then((t) => { licText = t; pre.textContent = t; }, () => { pre.textContent = T.licenseNg; });
  });
  $('li-close').addEventListener('click', () => { lic.hidden = true; });

  return {
    show() { paintVol(); paintShort(); resetWipe(); },
    close() { rights.hidden = true; lic.hidden = true; resetWipe(); },
  };
}
