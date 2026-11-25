// 巡業・本場所の相手（仮）：オンラインになるまでは CPU の形に、ランダムな四股名と称号をつける
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { randomShikona, randomTitle } from './names.js';
import { foeRate } from './rating.js';

export function makeFoe(rng, myRate) {
  const s = CPU_SHAPES[Math.floor(rng() * CPU_SHAPES.length)];
  return { id: s.id, pts: s.pts, shikona: randomShikona(rng), title: randomTitle(rng), rate: foeRate(myRate, rng) };
}
