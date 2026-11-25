// 取組の物理（Rapier 2D 決定論版）。描画・演出とは切りはなす（ここは結果だけ）。
// 同じ形・同じシード・同じ設定なら、どの端末でも同じ結果（指紋も同じ）。
// 決まり：時間きざみ固定・作る順番固定・四則演算だけ（Math.sin などを使わない）。
import { PAPER, PHYS } from '../data/config.js';
import { bbox, clipBand, area } from '../geom/poly.js';
import { decompose } from '../geom/decompose.js';
import { makeRng, fnv1a } from './rng.js';

let R = null;
export function setRapier(rapier) { R = rapier; }

// 紙の座標の形 → 体の中の座標（メートル・y 上向き）。side=-1 は左右反転（右側の力士）
export function toLocal(pts, side, phys = PHYS) {
  const s = phys.paperM / PAPER.w;
  const bb = bbox(pts);
  const cx = (bb.x0 + bb.x1) / 2;
  const map = (p) => [side * (p[0] - cx) * s, (bb.y1 - p[1]) * s];
  const outline = pts.map(map);
  if (side < 0) outline.reverse();
  return { outline, s, cx, bottom: bb.y1 };
}

function localPieces(pts, side, phys) {
  const pieces = decompose(pts);
  if (!pieces) return null;
  const s = phys.paperM / PAPER.w;
  const bb = bbox(pts);
  const cx = (bb.x0 + bb.x1) / 2;
  // 力士のいちばん下から footH（紙の高さの割合）までが「足」、それより上が「体」（土俵についたら負け）。凸の形を線で2つに切る
  const yl = bb.y1 - phys.footH * PAPER.h;
  const out = [];
  for (const pc of pieces) {
    for (const [part, isBody] of [[clipBand(pc, -1e9, yl), true], [clipBand(pc, yl, 1e9), false]]) {
      if (part.length < 3 || area(part) < 1) continue;
      const arr = new Float32Array(part.length * 2);
      for (let i = 0; i < part.length; i++) {
        arr[i * 2] = side * (part[i][0] - cx) * s;
        arr[i * 2 + 1] = (bb.y1 - part[i][1]) * s;
      }
      out.push({ arr, isBody });
    }
  }
  return out;
}

function pulse(u) {
  // 0→1→0 のなめらかな山（u は 0〜1）
  const v = u * (1 - u);
  return 16 * v * v;
}

// opts: { a, b（紙の座標の形）, seed, phys（上書き）, record }
export function createBout(opts) {
  if (!R) throw new Error('Rapier not set');
  const phys = Object.assign({}, PHYS, opts.phys || {});
  const rng = makeRng((opts.seed >>> 0) || 1);
  const dt = phys.dt;
  const world = new R.World({ x: 0, y: -phys.gravity });
  world.timestep = dt;

  const Max = R.CoefficientCombineRule.Max;
  // 土俵（上の面が y=0。トンと突き上げる）
  const ringBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -phys.ringDepth / 2));
  const ringCol = world.createCollider(
    R.ColliderDesc.cuboid(phys.ringHalf, phys.ringDepth / 2).setFriction(phys.friction).setFrictionCombineRule(Max)
      .setRestitution(phys.restitution), ringBody);
  // 土俵の下の地面
  const floorBody = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -phys.ringDepth - 0.5));
  const floorCol = world.createCollider(R.ColliderDesc.cuboid(phys.ringHalf * 4, 0.5).setFriction(phys.friction), floorBody);

  const makeFighter = (pts, side) => {
    const pieces = localPieces(pts, side, phys);
    if (!pieces) throw new Error('bad shape');
    const x0 = -side * phys.startX;
    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(x0, 0.002)
        .setLinearDamping(phys.linearDamping).setAngularDamping(phys.angularDamping).setCcdEnabled(true));
    const cols = [], bodyCols = [];
    for (const pc of pieces) {
      const c = world.createCollider(
        R.ColliderDesc.convexHull(pc.arr).setDensity(phys.density).setFriction(phys.frictionBody).setFrictionCombineRule(Max)
          .setRestitution(phys.restitution), body);
      cols.push(c);
      if (pc.isBody) bodyCols.push(c);
    }
    return { body, cols, bodyCols, dir: side, fallCount: 0, touchCount: 0, lost: null, lostAt: 0, at: null };
  };
  // 左（a）は右向き、右（b）は左右反転して左向き
  const A = makeFighter(opts.a, 1);
  const B = makeFighter(opts.b, -1);
  const fighters = [A, B];

  const settleSteps = Math.round(phys.settle / dt);
  const maxSteps = settleSteps + Math.round(phys.maxTime / dt);
  const fallSteps = Math.round(phys.fallHold / dt);
  const touchSteps = Math.max(1, Math.round(phys.touchHold / dt));
  const tapSteps = Math.round(phys.tapPeriod / dt);
  const tapLenSteps = Math.max(1, Math.round(phys.tapLen / dt));
  const firstTap = settleSteps + Math.round(rng() * tapSteps * 0.5);

  let step = 0;
  let tapStart = -1, tapAmp = 0;
  const result = { winner: null, kind: null, time: 0, steps: 0, hash: 0, loser: null };
  const rec = opts.record ? { n: 0, f: new Float32Array((maxSteps + touchSteps + 1) * 8), settleSteps, dt } : null;
  let touching = false;

  // 押す点：重心の真下で、足もとから重心までの driveHeight の高さ（回転は考えない＝四則演算だけ）
  const drivePoint = (f) => {
    const c = f.body.worldCom();
    const h = f.body.localCom().y;
    return { x: c.x, y: c.y - (1 - phys.driveHeight) * h };
  };
  // 足の踏ん張り：土俵から受けた力（前のこま）÷ 自分の重さ。持ち上げられると 0 に近づく
  const grip = (f) => {
    let imp = 0;
    for (const c of f.cols) {
      world.contactPair(ringCol, c, (m) => {
        const k = m.numContacts();
        for (let i = 0; i < k; i++) imp += m.contactImpulse(i);
      });
    }
    const g = imp / dt / (f.body.mass() * phys.gravity);
    return g > phys.gripMax ? phys.gripMax : g;
  };
  const touches = (f, col) => {
    let hit = false;
    for (const c of f.cols) {
      world.contactPair(col, c, (m) => { if (m.numContacts() > 0) hit = true; });
      if (hit) return true;
    }
    return false;
  };
  // 俵より外で、本当に土俵にふれている所（足でも体でも）。ふれていれば、その場所（世界の座標）を返す。
  // 土俵は回らないので、土俵から見た x がそのまま中心からの距離（四則演算とくらべるだけ）
  const outside = (f) => {
    let at = null;
    const ry = ringBody.translation().y;
    for (const c of f.cols) {
      world.contactPair(ringCol, c, (m, flipped) => {
        const k = m.numContacts();
        for (let i = 0; i < k && !at; i++) {
          if (!(m.contactDist(i) <= 0 || m.contactImpulse(i) > 0)) continue;
          const p = flipped ? m.localContactPoint2(i) : m.localContactPoint1(i);
          if (p && (p.x > phys.tawara || p.x < -phys.tawara)) at = { x: p.x, y: p.y + ry };
        }
      });
      if (at) return at;
    }
    return null;
  };
  const fightersTouch = () => {
    for (const c of A.cols) {
      let hit = false;
      for (const d of B.cols) {
        world.contactPair(c, d, (m) => { if (m.numContacts() > 0) hit = true; });
        if (hit) return true;
      }
    }
    return false;
  };

  function record() {
    if (!rec) return;
    const o = rec.n * 8, f = rec.f;
    const ta = A.body.translation(), tb = B.body.translation();
    f[o] = ta.x; f[o + 1] = ta.y; f[o + 2] = A.body.rotation();
    f[o + 3] = tb.x; f[o + 4] = tb.y; f[o + 5] = B.body.rotation();
    f[o + 6] = ringBody.translation().y + phys.ringDepth / 2;
    f[o + 7] = touching ? 1 : 0;
    rec.n++;
  }
  record();

  function judge(f) {
    if (f.lost) return;
    const com = f.body.worldCom();
    if (com.y < 0 || touches(f, floorCol)) { f.lost = 'out'; f.lostAt = step; return; }
    // 俵の外の土俵（蛇の目・土俵の横の面）にふれたら負け（踏み出し・勇み足など。11/26 しょーくん「土俵の外に足がついたら負け」）
    if (phys.tawara > 0) {
      const at = outside(f);
      if (at) { f.lost = 'out'; f.lostAt = step; f.at = at; return; }
    }
    if (phys.touchLose) {
      // 体が土俵についたら負け。touchReal：本当にふれた（めりこんだか、押し返す力が出た）所だけを数える
      // （近いだけの「ふれそう」は数えない）→ 頭から落ちてはねても負け（11/25 しょーくん）。touchHold 秒つづいたら負け
      let hit = null;
      for (const c of f.bodyCols) {
        world.contactPair(ringCol, c, (m) => {
          const k = m.numContacts();
          if (hit || k === 0) return;
          if (phys.touchReal) {
            let real = false;
            for (let i = 0; i < k && !real; i++) real = m.contactDist(i) <= 0 || m.contactImpulse(i) > 0;
            if (!real) return;
          }
          const p = m.numSolverContacts() > 0 ? m.solverContactPoint(0) : null;
          hit = p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
        });
        if (hit) break;
      }
      if (hit) {
        f.touchCount++;
        if (f.touchCount >= touchSteps) { f.lost = 'touch'; f.lostAt = step - f.touchCount + 1; f.at = hit; return; }
      } else {
        f.touchCount = 0;
      }
    }
    const ang = f.body.rotation();
    if (ang > phys.fallAngle || ang < -phys.fallAngle) {
      f.fallCount++;
      if (f.fallCount >= fallSteps) { f.lost = 'fall'; f.lostAt = step - f.fallCount + 1; }
    } else {
      f.fallCount = 0;
    }
  }

  function stepOnce() {
    if (result.kind) return true;
    const live = step >= settleSteps;
    // ゆれ
    if (live && step >= firstTap && (step - firstTap) % tapSteps === 0) {
      const tsec = (step - settleSteps) * dt;
      let mult = 1;
      if (tsec > phys.stallStart) mult = 1 + phys.stallGrow * (tsec - phys.stallStart);
      if (mult > phys.stallMax) mult = phys.stallMax;
      tapAmp = phys.tapAmp * mult * (1 + phys.tapJitter * (2 * rng() - 1));
      tapStart = step;
      if (phys.drive === 'hop') {
        for (const f of fighters) {
          if (touches(f, ringCol)) f.body.applyImpulseAtPoint({ x: f.dir * phys.hopImpulse, y: phys.hopLift }, drivePoint(f), true);
        }
      }
    }
    let yOff = 0;
    if (tapStart >= 0 && step - tapStart < tapLenSteps) yOff = tapAmp * pulse((step - tapStart) / tapLenSteps);
    ringBody.setNextKinematicTranslation({ x: 0, y: -phys.ringDepth / 2 + yOff });
    // 突進
    if (live) {
      if (step === settleSteps) {
        for (const f of fighters) f.body.applyImpulseAtPoint({ x: f.dir * phys.openImpulse, y: 0 }, drivePoint(f), true);
      }
      if (phys.drive === 'push') {
        for (const f of fighters) {
          const g = phys.gripDrive ? grip(f) : (touches(f, ringCol) ? 1 : 0);
          if (g <= 0) continue;
          f.body.applyImpulseAtPoint({ x: f.dir * phys.pushForce * g * dt, y: 0 }, drivePoint(f), true);
        }
      }
    }
    world.step();
    step++;
    touching = fightersTouch();
    record();
    if (step > settleSteps) {
      judge(A); judge(B);
      if (A.lost || B.lost) {
        // 負けは「始まった時」でくらべる（体は、ついたはじめの時）。相手が負けた時より前から体がついていて、
        // まだ touchHold に届いていない方がいたら、届くか離れるまで待つ（先に体がついた方の負け）
        const first = A.lost && B.lost ? null : (A.lost ? A : B);
        const other = first === A ? B : A;
        const waiting = first && !other.lost && other.touchCount > 0 && step - other.touchCount + 1 < first.lostAt;
        if (!waiting) {
          let la = !!A.lost, lb = !!B.lost;
          if (la && lb && A.lostAt !== B.lostAt) { if (A.lostAt < B.lostAt) lb = false; else la = false; }
          if (la && lb) { result.kind = 'both'; }
          else { result.winner = la ? 'b' : 'a'; result.loser = la ? 'a' : 'b'; result.kind = la ? A.lost : B.lost; }
          result.at = (la && A.at) || (lb && B.at) || null;
        }
      } else if (step >= maxSteps) {
        result.kind = 'time';
      }
      if (result.kind) finish();
    }
    return !!result.kind;
  }

  function finish() {
    result.steps = step - settleSteps;
    result.time = result.steps * dt;
    const ta = A.body.translation(), tb = B.body.translation();
    const v = new Float32Array([ta.x, ta.y, A.body.rotation(), tb.x, tb.y, B.body.rotation()]);
    const code = result.winner === 'a' ? 1 : result.winner === 'b' ? 2 : 3;
    const words = Array.from(new Uint32Array(v.buffer));
    words.push(step, code);
    result.hash = fnv1a(words);
  }

  return {
    phys, rec, result,
    get step() { return step; },
    settleSteps, maxSteps,
    stepOnce,
    free() { world.free(); },
  };
}

// 描画なしで最後まで（相性表・研究用）
export function runBout(opts) {
  const bout = createBout(opts);
  while (!bout.stepOnce()) { /* 進める */ }
  const r = Object.assign({}, bout.result);
  bout.free();
  return r;
}

export function hashText(h) {
  return (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
}
