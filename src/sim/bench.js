// 「指紋」用の決まった3番。スマホ・iPad・サーバーで同じ指紋なら、同じ結果になっている。
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { runBout, hashText } from './battle.js';

const by = (id) => CPU_SHAPES.find((s) => s.id === id).pts;

export const BENCH = [
  { a: by('kane'), b: by('kusabi'), seed: 1 },
  { a: by('tako'), b: by('hook'), seed: 2 },
  { a: by('furiko'), b: by('tako'), seed: 3 },
];

export function fingerprint() {
  return BENCH.map((b) => hashText(runBout(b).hash).slice(0, 4)).join(' ');
}
