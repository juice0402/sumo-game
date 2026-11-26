// 称号の手に入れ方（11/26 しょーくん「？？？　〇〇の時に〇〇になる、みたいなヒント」→ 条件ははっきり書く）。
// 力士の編集の「称号の手に入れ方」から開く一枚（出る物と確率と同じ形のシート）。
// 持っている称号は名前、持っていない称号は「？？？」。取組の実績は条件をそのまま、福箱の称号は段だけ（名前は開けてのおたのしみ）。
import { T } from '../data/text.js';
import { TITLES, TITLE_ACH, TITLE_START } from '../data/titles.js';
import { tierOf } from '../game/fukubako.js';

// cb：{ getOwned()＝持っている語と称号の Set }
export function initTitleList(cb) {
  const sheet = document.getElementById('s-titles'), body = document.getElementById('ti-list');
  const nameOf = (id) => (TITLES.find((t) => t.id === id) || {}).t || id;

  function row(id, how, stamp, has) {
    const p = document.createElement('p');
    p.className = has ? 'has' : 'not';
    const b = document.createElement('b');
    b.className = 'brush';
    b.textContent = has ? nameOf(id) : T.titleUnknown;
    p.appendChild(b);
    if (stamp) {
      const i = document.createElement('i');
      i.className = 'hanko brush';
      i.textContent = stamp.name;
      i.style.color = stamp.color;
      p.appendChild(i);
    } else {
      const s = document.createElement('span');
      s.textContent = how;
      p.appendChild(s);
    }
    return p;
  }
  function section(head) {
    const sec = document.createElement('section');
    sec.className = 'tilist';
    const h = document.createElement('h2');
    h.textContent = head;
    sec.appendChild(h);
    body.appendChild(sec);
    return sec;
  }

  function paint() {
    const has = cb.getOwned();
    body.textContent = '';
    const ach = section(T.titleByBout);
    for (const id of Object.keys(TITLE_ACH)) ach.appendChild(row(id, TITLE_ACH[id], null, has.has(id)));
    const fuku = section(T.titleByFuku);
    const rest = TITLES.filter((t) => t.id !== TITLE_START && !TITLE_ACH[t.id]);
    // 段の順（並 → 極）
    const order = ['nami', 'jo', 'tokujo', 'kiwami'];
    rest.sort((a, b) => order.indexOf((tierOf(a.id) || {}).id) - order.indexOf((tierOf(b.id) || {}).id));
    for (const t of rest) fuku.appendChild(row(t.id, '', tierOf(t.id), has.has(t.id)));
    section(T.titleByStart).appendChild(row(TITLE_START, T.titleStartHow, null, true));
  }

  document.getElementById('ti-close').addEventListener('click', () => { sheet.hidden = true; });
  return {
    open() { paint(); sheet.hidden = false; body.scrollTop = 0; },
    close() { sheet.hidden = true; },
  };
}
