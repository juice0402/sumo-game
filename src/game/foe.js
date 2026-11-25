// 巡業・本場所の相手（仮）：オンラインになるまでは CPU の形に、ランダムな四股名と称号をつける
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { randomShikona, randomTitle } from './names.js';
import { foeRate } from './rating.js';
import { FUKU_TIERS } from '../data/fukubako.js';
import { PAPER_DEFAULT } from '../data/papers.js';
import { AURA_DEFAULT } from '../data/auras.js';

// 相手の紙質と気（見た目だけ）：半分ほどはふつう。あとは段の出やすさで → 相手を見て「こんなのほしい！」に
function cosmetic(kind, plain, pPlain, rng) {
  if (rng() < pPlain) return plain;
  const r = rng() * 100, tier = r < 70 ? 'nami' : r < 90 ? 'jo' : r < 99 ? 'tokujo' : 'kiwami';
  const list = FUKU_TIERS[kind][tier];
  return list[Math.floor(rng() * list.length)];
}

export function makeFoe(rng, myRate) {
  const s = CPU_SHAPES[Math.floor(rng() * CPU_SHAPES.length)];
  return { id: s.id, pts: s.pts, shikona: randomShikona(rng), title: randomTitle(rng), rate: foeRate(myRate, rng),
    paper: cosmetic('paper', PAPER_DEFAULT, 0.5, rng), aura: cosmetic('aura', AURA_DEFAULT, 0.55, rng) };
}
