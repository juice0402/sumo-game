// 本場所の会場の飾り（見た目だけ・物理にさわらない）：座布団・座っている人・段・提灯・吊り屋根と紫の幕と四房。
// ぜんぶコードで描く紙の切り絵（C）。数は data/venue.js（番付ごと）。床の高さを y=0 として作る（stage3d が床に合わせて置く）。
// 軽く：人と座布団は InstancedMesh（形ごとに1回で描く）・提灯と四房は Sprite・影は落とさない。
// 正面（カメラの側＝+z）のまん中には人を座らせない・段も作らない（力士と、土俵の横の面の字をかくさない）
import { COL, rand, fiberPattern } from './ink.js';
import { VENUE, VL } from '../data/venue.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const TAU = Math.PI * 2;

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// 観客の紙：白い体（着物の色はあとでのせる）・灰の頭（のせると髪の色）・墨のふち。kind 0 大人・1 お団子・2 子ども
function personCanvas(kind) {
  const W = 96, H = 128, c = cv(W, H), g = c.getContext('2d');
  const s = kind === 2 ? 0.8 : 1, cx = W / 2, b = H - 4, top = b - 62 * s, hr = 15 * s, hy = top - hr + 5 * s;
  const body = () => {
    g.beginPath();
    g.moveTo(cx - 40 * s, b);
    g.bezierCurveTo(cx - 41 * s, b - 34 * s, cx - 34 * s, top + 4 * s, cx - 13 * s, top);
    g.lineTo(cx + 13 * s, top);
    g.bezierCurveTo(cx + 34 * s, top + 4 * s, cx + 41 * s, b - 34 * s, cx + 40 * s, b);
    g.closePath();
  };
  const head = () => {
    g.beginPath();
    g.arc(cx, hy, hr, 0, TAU);
    if (kind === 1) { g.moveTo(cx + 15 * s, hy - hr - 2 * s); g.arc(cx + 7 * s, hy - hr - 2 * s, 8 * s, 0, TAU); }
  };
  g.lineJoin = 'round';
  g.fillStyle = '#ffffff'; body(); g.fill();
  g.fillStyle = fiberPattern(g); g.fill();
  g.strokeStyle = 'rgba(32,30,27,0.45)'; g.lineWidth = 2;   // 襟
  g.beginPath(); g.moveTo(cx - 11 * s, top + 1); g.lineTo(cx, top + 18 * s); g.lineTo(cx + 11 * s, top + 1); g.stroke();
  g.strokeStyle = COL.sumi; g.lineWidth = 3.5; body(); g.stroke();
  g.fillStyle = '#4a4540'; head(); g.fill(); g.stroke();
  return c;
}

// 座布団：白（色はあとでのせる）・まわりのぬい目・まん中の房・墨のふち
function zabCanvas() {
  const N = 64, m = 5, c = cv(N, N), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; rrect(g, m, m, N - 2 * m, N - 2 * m, 9); g.fill();
  g.strokeStyle = 'rgba(32,30,27,0.35)'; g.lineWidth = 1.5; rrect(g, m + 8, m + 8, N - 2 * m - 16, N - 2 * m - 16, 6); g.stroke();
  g.fillStyle = 'rgba(32,30,27,0.6)'; g.beginPath(); g.arc(N / 2, N / 2, 3, 0, TAU); g.fill();
  g.strokeStyle = COL.sumi; g.lineWidth = 3; rrect(g, m, m, N - 2 * m, N - 2 * m, 9); g.stroke();
  return c;
}

// 提灯：上のひも・胴（骨の線と丸い紋）・上下の黒いふた・墨のふち。光る輪は描かない（灯った紙の色だけ）
function lampCanvas(col) {
  const W = 64, H = 96, cx = W / 2, cy = 51, rx = 24, ry = 33, c = cv(W, H), g = c.getContext('2d');
  g.strokeStyle = COL.sumi; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, 14); g.stroke();
  const body = () => { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); };
  body(); g.fillStyle = col; g.fill();
  g.save(); body(); g.clip();
  g.strokeStyle = 'rgba(32,30,27,0.26)'; g.lineWidth = 1.4;
  for (let y = cy - ry + 6; y < cy + ry; y += 7) { g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(cx, y + 3, W, y); g.stroke(); }
  g.fillStyle = col === VL.lampCol[0] ? COL.shu : VL.lampCol[0];
  g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = COL.sumi; g.lineWidth = 2.5; body(); g.stroke();
  g.fillStyle = COL.sumi; g.fillRect(cx - 13, 12, 26, 8); g.fillRect(cx - 13, H - 15, 26, 8);
  return c;
}

// 四房：ひも・結び目・房（すじ）
function fusaCanvas(col) {
  const W = 40, H = 160, cx = W / 2, c = cv(W, H), g = c.getContext('2d');
  const line = col === VL.fusa.nw ? VL.woodLine : COL.sumi;   // 黒い房は、暗い場でも形が見えるように茶のふち
  g.strokeStyle = line; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, 60); g.stroke();
  g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, 60); g.stroke();
  const tassel = () => { g.beginPath(); g.moveTo(cx - 6, 70); g.lineTo(cx + 6, 70); g.lineTo(cx + 16, H - 3); g.lineTo(cx - 16, H - 3); g.closePath(); };
  tassel(); g.fillStyle = col; g.fill();
  g.save(); tassel(); g.clip();
  g.strokeStyle = 'rgba(32,30,27,0.3)'; g.lineWidth = 1;
  for (let i = -15; i <= 15; i += 3) { g.beginPath(); g.moveTo(cx + i * 0.35, 70); g.lineTo(cx + i, H); g.stroke(); }
  g.restore();
  g.strokeStyle = line; g.lineWidth = 2; tassel(); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(cx, 66, 7, 0, TAU); g.fill(); g.stroke();
  return c;
}

// 紫の幕（水引幕）：下のふちはゆるい3つの弧（切り絵）・ひだ・上の帯・まん中に紋（丸に三つ星の形）
function curtainCanvas(gold) {
  const W = 640, H = 80, c = cv(W, H), g = c.getContext('2d');
  const path = () => {
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, H - 14);
    for (let i = 3; i > 0; i--) { const x0 = (i * W) / 3, x1 = ((i - 1) * W) / 3; g.quadraticCurveTo((x0 + x1) / 2, H + 8, x1, H - 14); }
    g.closePath();
  };
  path(); g.fillStyle = VL.curtain; g.fill();
  g.save(); path(); g.clip();
  g.fillStyle = fiberPattern(g); g.fillRect(0, 0, W, H);
  g.strokeStyle = VL.curtainFold; g.lineWidth = 3;
  for (let x = 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 4, H); g.stroke(); }
  g.fillStyle = gold ? COL.kin : '#2e1f3d'; g.fillRect(0, 0, W, 8);
  g.restore();
  const mc = gold ? '#dcc27a' : COL.kin, mx = W / 2, my = H / 2 - 1, mr = 21;
  g.strokeStyle = mc; g.lineWidth = 3; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.stroke();
  g.fillStyle = mc;
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * TAU) / 3; g.beginPath(); g.arc(mx + Math.cos(a) * mr * 0.45, my + Math.sin(a) * mr * 0.45, mr * 0.3, 0, TAU); g.fill(); }
  g.strokeStyle = COL.sumi; g.lineWidth = 3; path(); g.stroke();
  return c;
}

// lv：番付の順（0 序ノ口〜9 横綱）。もどり値の group.userData.free() で、作った絵と形をすてる
export function buildVenue(THREE, lv) {
  const V = VENUE[Math.max(0, Math.min(VENUE.length - 1, lv))];
  const group = new THREE.Group();
  const trash = [];
  const k = (o) => { trash.push(o); return o; };
  const tex = (c) => { const t = k(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const r = rand(97 + lv * 13);
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const D = THREE.DoubleSide;

  // 席（座布団の場所）：土俵のまわりの列（四方）＋うしろと左右の段
  const seats = [];
  const OUT = { b: [0, -1], f: [0, 1], l: [-1, 0], r: [1, 0] };
  const RY = { b: 0, f: Math.PI, l: Math.PI / 2, r: -Math.PI / 2 };   // 土俵のほうを向く
  const ring = (d, y, sides, stand, row) => {
    for (const sd of sides) {
      for (let t = -d + VL.seat / 2; t < d; t += VL.seat) {
        if ((sd === 'l' || sd === 'r') && (t < -d + VL.seat * 0.75 || (sides.includes('f') && t > d - VL.seat * 0.75))) continue;   // かどは前とうしろの列に
        const x = sd === 'b' || sd === 'f' ? t : sd === 'l' ? -d : d, z = sd === 'b' ? -d : sd === 'f' ? d : t;
        seats.push({ x, y, z, ry: RY[sd], o: OUT[sd], front: sd === 'f' && Math.abs(x) < VL.frontGap && d < VL.frontNear, stand, row });
      }
    }
  };
  for (let i = 0; i < V.zab; i++) ring(VL.zab0 + i * VL.zabStep, 0, ['b', 'f', 'l', 'r'], false, i);
  for (let j = 0; j < V.stand; j++) ring(VL.stand0 + j * VL.standStep, VL.standY0 + j * VL.standRise, ['b', 'l', 'r'], true, j + 1);

  // 座布団
  const zg = k(new THREE.PlaneGeometry(VL.zabSize, VL.zabSize)); zg.rotateX(-Math.PI / 2);
  const zab = k(new THREE.InstancedMesh(zg, k(new THREE.MeshBasicMaterial({ map: tex(zabCanvas()), alphaTest: 0.5 })), seats.length));
  seats.forEach((s, i) => {
    e.set(0, s.ry + (r() - 0.5) * 0.25, 0); q.setFromEuler(e);
    p.set(s.x + (r() - 0.5) * 0.05, s.y + 0.012, s.z + (r() - 0.5) * 0.05);
    zab.setMatrixAt(i, m4.compose(p, q, sc));
    zab.setColorAt(i, col.set(VL.zabCol[s.row % VL.zabCol.length]));
  });
  group.add(zab);

  // 座っている人（形が3つ＝3回で描く）
  const ph = VL.personH, pg = k(new THREE.PlaneGeometry(ph * 0.75, ph)); pg.translate(0, ph / 2, 0);
  const lists = [[], [], []];
  for (const s of seats) {
    const on = s.stand ? r() < V.fill : !s.front && r() < V.sit;
    if (on) lists[r() < 0.12 ? 2 : r() < 0.3 ? 1 : 0].push(s);
  }
  lists.forEach((L, kind) => {
    if (!L.length) return;
    const im = k(new THREE.InstancedMesh(pg, k(new THREE.MeshBasicMaterial({ map: tex(personCanvas(kind)), alphaTest: 0.5, side: D })), L.length));
    L.forEach((s, i) => {
      e.set(0, s.ry + (r() - 0.5) * 0.3, 0); q.setFromEuler(e);
      const z = 0.92 + r() * 0.16; sc.set(z, z, z);
      p.set(s.x + s.o[0] * 0.05 + (r() - 0.5) * 0.06, s.y + 0.02, s.z + s.o[1] * 0.05 + (r() - 0.5) * 0.06);
      im.setMatrixAt(i, m4.compose(p, q, sc));
      col.set(VL.clothes[Math.floor(r() * VL.clothes.length)]);
      if (s.o[1] > 0) col.multiplyScalar(VL.nearDim);   // 正面（カメラの近く）の人は、暗い影に（目立ちすぎない）
      im.setColorAt(i, col);
    });
    sc.set(1, 1, 1);
    group.add(im);
  });

  // 段（厚紙の箱）：うしろと左右
  if (V.stand) {
    const sm = k(new THREE.MeshLambertMaterial({ color: VL.stand })), em = k(new THREE.LineBasicMaterial({ color: '#3d3530' }));
    const box = (w, h, d, x, z) => {
      const g = k(new THREE.BoxGeometry(w, h, d)), m = new THREE.Mesh(g, sm);
      m.position.set(x, h / 2, z);
      m.add(new THREE.LineSegments(k(new THREE.EdgesGeometry(g)), em));
      group.add(m);
    };
    for (let j = 0; j < V.stand; j++) {
      const d = VL.stand0 + j * VL.standStep, h = VL.standY0 + j * VL.standRise, w = VL.standStep;
      box(2 * d + w, h, w, 0, -d);
      for (const sx of [-1, 1]) box(w, h, 2 * d - w / 2, sx * d, w / 4);
    }
  }

  // 提灯：うしろの列 → 2列めと左右をかわるがわる → のこりの左右。ひもで吊る（ひもはゆるくたわむ）
  if (V.lamp) {
    const A = VL.lampRow, B = VL.lampRow2, S = VL.lampSide, back = [], row2 = [], side = [];
    for (let i = 0; i < 10; i++) back.push({ row: 'a', x: (Math.floor(i / 2) + 0.5) * A.step * (i % 2 ? 1 : -1), z: A.z, y: A.y });
    for (let i = 0; i < 10; i++) row2.push({ row: 'b', x: (Math.floor(i / 2) + (i % 2)) * B.step * (i % 2 ? 1 : -1), z: B.z, y: B.y });
    for (let m = 0; m < 10; m++) for (const sx of [-1, 1]) side.push({ row: sx < 0 ? 'l' : 'r', x: sx * S.x, z: -3.5 + m * S.step, y: S.y });
    const order = back.slice();
    while (row2.length || side.length) { order.push(...row2.splice(0, 2), ...side.splice(0, 2)); }
    const used = order.slice(0, V.lamp);
    const mats = VL.lampCol.map((c) => k(new THREE.SpriteMaterial({ map: tex(lampCanvas(c)), alphaTest: 0.5, fog: false })));
    // ひも：列ごとに、使う提灯のはしからはしまで。まん中ほど下がる
    const rows = {};
    for (const l of used) (rows[l.row] = rows[l.row] || []).push(l);
    const pts = [];
    for (const L of Object.values(rows)) {
      const along = L[0].row === 'l' || L[0].row === 'r' ? 'z' : 'x';
      const vs = L.map((l) => l[along]), a0 = Math.min(...vs) - 0.5, a1 = Math.max(...vs) + 0.5, mid = (a0 + a1) / 2, half = (a1 - a0) / 2;
      const ropeY = (a) => L[0].y + 0.2 - 0.14 * (1 - ((a - mid) / half) ** 2);
      for (const l of L) l.ty = ropeY(l[along]);
      for (let a = a0; a < a1 - 1e-6; a += 0.2) {
        const b = Math.min(a1, a + 0.2);
        const P0 = along === 'x' ? [a, ropeY(a), L[0].z] : [L[0].x, ropeY(a), a], P1 = along === 'x' ? [b, ropeY(b), L[0].z] : [L[0].x, ropeY(b), b];
        pts.push(...P0, ...P1);
      }
    }
    const rg = k(new THREE.BufferGeometry()); rg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.LineSegments(rg, k(new THREE.LineBasicMaterial({ color: VL.rope }))));
    used.forEach((l, i) => {
      const sp = new THREE.Sprite(mats[i % 3 === 2 ? 1 : 0]);
      sp.center.set(0.5, 1);
      sp.scale.set(VL.lampSize, VL.lampSize * 1.5, 1);
      sp.position.set(l.x, l.ty + 0.02, l.z);
      group.add(sp);
    });
  }

  // 吊り屋根（十両から）：紫の幕を四方に・屋根（切妻）・天井へつる線・四すみの房
  if (V.roof) {
    const R = VL.roofHalf, y0 = VL.roofY, H = VL.curtainH, gold = V.roof > 1;
    const cm = k(new THREE.MeshBasicMaterial({ map: tex(curtainCanvas(gold)), alphaTest: 0.5, side: D }));
    const cg = k(new THREE.PlaneGeometry(2 * R, H));
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, m = new THREE.Mesh(cg, cm);
      m.position.set(Math.sin(a) * R, y0 + H / 2, Math.cos(a) * R);
      m.rotation.y = a;
      group.add(m);
    }
    const wm = k(new THREE.MeshLambertMaterial({ color: VL.wood })), lm = k(new THREE.LineBasicMaterial({ color: gold ? COL.kin : VL.woodLine }));
    const eg = k(new THREE.BoxGeometry(2 * R + 0.3, 0.14, 2 * R + 0.3)), eaves = new THREE.Mesh(eg, wm);
    eaves.position.y = y0 + H + 0.07;
    eaves.add(new THREE.LineSegments(k(new THREE.EdgesGeometry(eg)), lm));
    group.add(eaves);
    const shape = new THREE.Shape([new THREE.Vector2(-R - 0.3, 0), new THREE.Vector2(R + 0.3, 0), new THREE.Vector2(0, 0.6)]);
    const rg = k(new THREE.ExtrudeGeometry(shape, { depth: 2 * R + 0.5, bevelEnabled: false })); rg.translate(0, 0, -(R + 0.25));
    const roof = new THREE.Mesh(rg, wm);
    roof.position.y = y0 + H + 0.14;
    roof.add(new THREE.LineSegments(k(new THREE.EdgesGeometry(rg)), lm));
    group.add(roof);
    const cab = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cab.push(sx * R, y0 + H + 0.14, sz * R, sx * R * 0.6, 9, sz * R * 0.6);
    const cbg = k(new THREE.BufferGeometry()); cbg.setAttribute('position', new THREE.Float32BufferAttribute(cab, 3));
    group.add(new THREE.LineSegments(cbg, k(new THREE.LineBasicMaterial({ color: VL.rope }))));
    for (const [id, sx, sz] of [['ne', -1, 1], ['se', -1, -1], ['sw', 1, -1], ['nw', 1, 1]]) {
      const sp = new THREE.Sprite(k(new THREE.SpriteMaterial({ map: tex(fusaCanvas(VL.fusa[id])), alphaTest: 0.5 })));
      sp.center.set(0.5, 1);
      sp.scale.set(VL.fusaLen * 0.25, VL.fusaLen, 1);
      sp.position.set(sx * R, y0 + 0.03, sz * R);
      group.add(sp);
    }
  }

  group.userData.free = () => { for (const o of trash) o.dispose(); };
  return group;
}
