// 帳面の取組記録（11/28・issue #28）：最近の取組（巡業・本場所・稽古）を新しい順に LOG_MAX まで（古いものから消える）。
// 1番＝リプレイに要る物ぜんぶ：両方の形・紙質・気・四股名・称号・番付・土俵・シード・動かし方・CONFIG_VERSION・結果と決まり手・日時・どこで取ったか。
// 物理は決まった計算なので、同じ物から createBout を作りなおせば同じ取組になる（tools/test.mjs がくらべる）。
// 保存したときの CONFIG_VERSION か、土俵の物理（data/stages.js の phys）が今とちがう取組は、見られない（canReplay）。
// 土俵は id をそのまま入れる（あとから足した土俵にも効く・id が今の一覧にない取組は見られない）。
import { CONFIG_VERSION } from '../data/config.js';
import { STAGES } from '../data/stages.js';
import { LOG_MAX } from '../data/settings.js';
import { checkShape } from '../geom/check.js';

const MODES = ['jungyo', 'honbasho', 'keiko'];

// 土俵の物理の印（FNV-1a）：同じ id でも物理の数字が変わったら別の取組になるので、見られないことにする
export function stageSig(id) {
  const S = STAGES[id];
  if (!S) return '';
  const s = JSON.stringify(S.phys || {});
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}

const who = (w, pts) => ({ pts, name: String((w && w.name) || ''), sub: String((w && w.sub) || ''), rank: String((w && w.rank) || '') });

// 取組が終わったときの1番。o：{ mode, stage, look, venue, upset, drive, seed, me（形）, foe（形）, a・b（{ name, sub, rank }）,
//   papers・auras（[a, b]）, winner（'a'・'b'・''）, kind（決着の種類）, kima（決まり手）, t（日時の ms） }
export function logEntry(o) {
  const stage = STAGES[o.stage] ? o.stage : 'hyojun';
  return {
    v: CONFIG_VERSION, sp: stageSig(stage), t: o.t || Date.now(), mode: o.mode, stage,
    look: o.look || null, venue: typeof o.venue === 'number' ? o.venue : -1, up: o.upset | 0,
    drive: o.drive === 'push' ? 'push' : 'hop', seed: o.seed >>> 0,
    a: who(o.a, o.me), b: who(o.b, o.foe),
    pa: (o.papers || []).slice(0, 2).map(String), au: (o.auras || []).slice(0, 2).map(String),
    w: o.winner === 'a' || o.winner === 'b' ? o.winner : '', k: String(o.kind || ''), km: String(o.kima || ''),
  };
}

// 新しい取組を先頭へ。古いものから消える
export function addLog(state, entry) {
  if (!Array.isArray(state.log)) state.log = [];
  state.log.unshift(entry);
  if (state.log.length > LOG_MAX) state.log.length = LOG_MAX;
}

// 読みこみ：形のこわれた物・知らない形は捨てる（前の版の保存には log がない＝からっぽ）
const okPts = (p) => Array.isArray(p) && p.length >= 3 && p.every((q) => Array.isArray(q) && q.length === 2 && Number.isInteger(q[0]) && Number.isInteger(q[1]));
const okWho = (w) => w && typeof w === 'object' && okPts(w.pts) && typeof w.name === 'string';
export function cleanLog(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const e of arr) {
    if (!e || typeof e !== 'object' || !MODES.includes(e.mode) || !Number.isFinite(e.t) || !Number.isInteger(e.seed)) continue;
    if (!okWho(e.a) || !okWho(e.b) || typeof e.stage !== 'string') continue;
    out.push({
      v: Number.isInteger(e.v) ? e.v : 0, sp: typeof e.sp === 'string' ? e.sp : '', t: e.t, mode: e.mode, stage: e.stage,
      look: typeof e.look === 'string' ? e.look : null, venue: Number.isInteger(e.venue) ? e.venue : -1, up: e.up | 0,
      drive: e.drive === 'push' ? 'push' : 'hop', seed: e.seed >>> 0,
      a: who(e.a, e.a.pts), b: who(e.b, e.b.pts),
      pa: Array.isArray(e.pa) ? e.pa.slice(0, 2).map(String) : [], au: Array.isArray(e.au) ? e.au.slice(0, 2).map(String) : [],
      w: e.w === 'a' || e.w === 'b' ? e.w : '', k: typeof e.k === 'string' ? e.k : '', km: typeof e.km === 'string' ? e.km : '',
    });
    if (out.length >= LOG_MAX) break;
  }
  return out;
}

// 同じ取組を作りなおせるか：設定の版と土俵の物理が今と同じ・形が今の点検を通る
export function canReplay(e) {
  return !!e && e.v === CONFIG_VERSION && !!STAGES[e.stage] && e.sp === stageSig(e.stage) && checkShape(e.a.pts).ok && checkShape(e.b.pts).ok;
}

// createBout にわたす物（bout.js と tools/test.mjs で同じ）
export function replayBoutOpts(e) {
  return { a: e.a.pts, b: e.b.pts, seed: e.seed, phys: Object.assign({ drive: e.drive }, STAGES[e.stage].phys) };
}
