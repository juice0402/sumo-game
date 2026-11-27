// 取組の 2.5D（Three.js）。物理は2Dのまま。z=0 の面に、紙の力士を立てて描くだけ。
// カメラは土俵にくっつける：描くときの y は「物理の y − 土俵の上の面の y」＝土俵のトンで画面がゆれない。
import { COL, rand, fiberPattern, polyPath, inkStroke } from './ink.js';
import { paperFill, patternFill } from './papertex.js';
import { DOHYO, DOHYO_DEFAULT } from '../data/dohyo.js';
import { LOOK } from '../data/look.js';
import { PAPER } from '../data/config.js';
import { buildVenue, venueArtCount } from './venue.js';
import { VL } from '../data/venue.js';

const D2R = Math.PI / 180;

function makeTex(THREE, c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 土俵の上の面：和紙 → すじ → 墨の輪 → 仕切り線
function topCanvas(d, P) {
  const N = 1024, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const k = N / (2 * P.ringHalf);
  g.fillStyle = d.top.paper;
  g.fillRect(0, 0, N, N);
  if (d.top.pat) { g.fillStyle = patternFill(g, d.top.pat, d.top.paper, d.top.ink || COL.sumi, k); g.fillRect(0, 0, N, N); }   // 土俵スキンのもよう
  g.globalAlpha = d.top.fiber;
  g.fillStyle = fiberPattern(g);
  g.fillRect(0, 0, N, N);
  g.globalAlpha = 1;
  // 輪（俵）の外がわを、物理の俵の線（P.tawara）にぴったり合わせる＝見えている輪の外にふれたら負け
  const sw = d.top.ringW * N * 0.6, rr = rand(5), r = P.tawara * k - sw / 2, pts = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2 + 0.4, j = 1 + (rr() - 0.5) * 0.008;
    pts.push([N / 2 + Math.cos(a) * r * j, N / 2 + Math.sin(a) * r * j]);
  }
  inkStroke(g, pts, (p) => p, sw, d.top.ring);
  if (d.top.shikiri) {
    for (const s of [-1, 1]) {
      const x = N / 2 + s * d.top.shikiri * k, h = (d.top.shikiriLen * k) / 2;
      inkStroke(g, [[x, N / 2 - h], [x, N / 2 + h]], (p) => p, 0.022 * k, d.top.shikiriInk || COL.sumi);
    }
  }
  return c;
}

// 土俵の横の面：厚紙 → すじ → 断面の線 → ふちどり
function sideCanvas(d, P) {
  const w = 1024, h = Math.round((w * P.ringDepth) / (2 * P.ringHalf));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const k = w / (2 * P.ringHalf);
  g.fillStyle = d.side.paper;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.8;
  g.fillStyle = fiberPattern(g);
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  g.strokeStyle = d.side.layer;
  g.lineWidth = 1.5;
  for (const y of [5, 9, 13]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const m = d.side.inset * k;
  g.strokeStyle = d.side.line;
  g.lineWidth = 4;
  g.strokeRect(m, m + 10, w - 2 * m, h - 2 * m - 10);
  return c;
}

// 力士の紙の表：和紙 → すじ → 体と足のさかい（点線）→ 墨のふち
function paperCanvas(ol, dark, P, box, paper) {
  const k = 520 / box.sx;
  const c = document.createElement('canvas');
  c.width = Math.ceil(box.sx * k); c.height = Math.ceil(box.sy * k);
  const g = c.getContext('2d');
  const tx = (p) => [(p[0] - box.x0) * k, (box.y1 - p[1]) * k];
  polyPath(g, ol.outline, tx);
  g.fillStyle = paperFill(g, paper, k * PAPER.w * ol.s);   // 紙質（福箱・見た目だけ）。紙の幅＝PAPER.w × 物理の倍率
  g.fill();
  if (dark) { g.fillStyle = 'rgba(32,30,27,0.12)'; g.fill(); }
  g.save();
  g.clip();
  const yl = P.footH * PAPER.h * ol.s;
  g.setLineDash([0.035 * k, 0.035 * k]);
  g.strokeStyle = 'rgba(32,30,27,0.38)';
  g.lineWidth = 0.008 * k;
  g.beginPath(); g.moveTo(0, tx([0, yl])[1]); g.lineTo(c.width, tx([0, yl])[1]); g.stroke();
  g.restore();
  g.setLineDash([]);
  polyPath(g, ol.outline, tx);
  g.lineJoin = 'round';
  g.strokeStyle = COL.sumi;
  g.lineWidth = 0.05 * k; // 半分は形の外なので、見えるのは 0.025m
  g.stroke();
  return c;
}

export function createStage(cv, P) {
  const THREE = window.THREE;
  if (!THREE) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // 影は、物が動いたときだけ描きなおす（旋回の間はカメラだけが動くので、影は同じ・11/25）
  renderer.shadowMap.autoUpdate = false;
  const shadowDirty = () => { renderer.shadowMap.needsUpdate = true; };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(LOOK.fov, 1, 0.1, 90);
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.1);
  sun.position.set(-2.6, 6, 4.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(LOOK.shadowMap, LOOK.shadowMap);
  const sc = sun.shadow.camera;
  sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 1; sc.far = 16;
  sun.shadow.bias = -0.0008;
  const hemi = new THREE.HemisphereLight(0xf4efe4, 0x3a3631, 1.8);
  scene.add(sun, sun.target, hemi);
  // 本場所の会場で、明かりがパッとつく（上から土俵を本当に照らす・光の輪の絵は描かない）。ふだんは 0
  const spot = new THREE.SpotLight(0xfff2dc, 0, 30, 0.42, 0.55, 2);
  spot.position.set(0, 9, 3.5);
  scene.add(spot, spot.target);
  // k：0＝暗い会場 → 1＝明かりがついた（パッのときは少し上）。会場がないときは、いつもの明るさ
  function lights(k, full = 1) {
    const d = VL.stageDim + (full - VL.stageDim) * Math.min(1, k);
    sun.intensity = 2.1 * d * (k > 1 ? 1 + (k - 1) * 0.5 : 1);
    hemi.intensity = 1.8 * d;
    spot.intensity = VL.spot * Math.min(k, 1.4);
  }

  let dohyo = null, fighters = [], base = 10, cssW = 1, cssH = 1;
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };
  const dohyoRes = [];
  const keepD = (o) => { dohyoRes.push(o); return o; };

  // 土俵（項目を読むだけ。見た目の項目を足せば別の土俵になる）
  function setDohyo(id) {
    if (dohyo) { scene.remove(dohyo, dohyo.userData.floor); }   // 床も外す（残すと箱の横の面をかくす）
    for (const o of dohyoRes.splice(0)) o.dispose();             // 前の土俵の絵と形をすてる（土俵を切りかえても重くならない）
    const d = DOHYO[id] || DOHYO[DOHYO_DEFAULT];
    scene.background = new THREE.Color(d.bg);
    scene.fog = new THREE.Fog(d.bg, base * 0.9, base * 2.2);
    const W = 2 * P.ringHalf, H = P.ringDepth;
    const side = keepD(new THREE.MeshLambertMaterial({ map: keepD(makeTex(THREE, sideCanvas(d, P))) }));
    const topMap = keepD(makeTex(THREE, topCanvas(d, P)));
    const top = keepD(new THREE.MeshLambertMaterial({ map: topMap, emissive: 0xffffff, emissiveMap: topMap, emissiveIntensity: LOOK.paperGlow * 0.4 }));
    const under = keepD(new THREE.MeshLambertMaterial({ color: d.floor }));
    const geo = keepD(new THREE.BoxGeometry(W, H, W));
    const box = new THREE.Mesh(geo, [side, side, top, under, side, side]);
    box.position.y = -H / 2;
    box.castShadow = true;
    box.receiveShadow = true;
    const edges = new THREE.LineSegments(keepD(new THREE.EdgesGeometry(geo)), keepD(new THREE.LineBasicMaterial({ color: d.edge })));
    box.add(edges);
    const floor = new THREE.Mesh(keepD(new THREE.PlaneGeometry(60, 60)), keepD(new THREE.MeshLambertMaterial({ color: d.floor })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    dohyo = new THREE.Group();
    dohyo.add(box);
    dohyo.userData = { floor, look: d };
    scene.add(dohyo, floor);
    shadowDirty();
  }

  // 本場所の会場の飾り（ui/venue.js・見た目だけ）。lv＝番付の順（0 序ノ口〜9 横綱）・-1 なし。同じ番付なら作りなおさない
  let venue = null, venueLv = -1, venueArt = 0;
  function setVenue(lv) {
    if (lv === venueLv && venueArt === venueArtCount()) { if (venue) venue.userData.reset(); return; }   // 同じ番付でも、Codex の絵が届いたら作りなおす
    venueArt = venueArtCount();
    if (venue) { scene.remove(venue); venue.userData.free(); venue = null; }
    venueLv = lv;
    if (lv < 0) { sun.intensity = 2.1; hemi.intensity = 1.8; spot.intensity = 0; return; }
    venue = buildVenue(THREE, lv);
    venue.position.y = dohyo.userData.floor.position.y;
    scene.add(venue);
    layoutVenue();
  }
  // 会場の書き割りを、真横で止まったときの画面に合わせる（画面の形が変わったときも）
  function layoutVenue() {
    if (!venue) return;
    const e = LOOK.elev * D2R;
    venue.userData.layout({ camY: P.ringDepth + LOOK.lookY + Math.sin(e) * base, camZ: Math.cos(e) * base, tanTop: Math.tan((LOOK.fov / 2 - LOOK.elev) * D2R) });
  }
  // 会場の時間：tt＝旋回のはじめからの秒（真横で止まったあとは 99）。観客が湧く・屋根が降りる・明かりがパッ・懸賞旗
  function venueTime(tt) {
    if (!venue) return;
    lights(venue.userData.time(tt), 1);
  }
  // 毎こま（ゆれ・雲・ちり・紙吹雪・座布団）。もどり値＝まだ動いている演出がある
  const venueTick = (dt) => (venue ? venue.userData.tick(dt) : false);
  const venueCheer = (kind, o) => { if (venue) venue.userData.cheer(kind, o); };
  const venueCues = () => (venue ? venue.userData.cues : []);

  function makeFighter(ol, dark, paper) {
    const pts = ol.outline, pad = 0.03;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const box = { x0: x0 - pad, y1: y1 + pad, sx: x1 - x0 + 2 * pad, sy: y1 - y0 + 2 * pad };
    const map = makeTex(THREE, paperCanvas(ol, dark, P, box, paper));
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: LOOK.paperT, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, -LOOK.paperT / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - box.x0) / box.sx, 1 - (box.y1 - pos.getY(i)) / box.sy);
    uv.needsUpdate = true;
    // 紙は光で暗くなりすぎないよう、同じ絵を少し自分で光らせる（和紙の白さを保つ）
    const mats = [new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: LOOK.paperGlow }), new THREE.MeshLambertMaterial({ color: dark ? '#7d7466' : '#958b79' })];
    const mesh = new THREE.Mesh(geo, mats);
    mesh.castShadow = true;
    mesh.userData.free = () => { geo.dispose(); map.dispose(); mats.forEach((m) => m.dispose()); };
    return mesh;
  }

  // papers：[a の紙質, b の紙質]（data/papers.js の id・見た目だけ）
  function setFighters(la, lb, papers = []) {
    for (const m of fighters) { scene.remove(m); m.userData.free(); }
    fighters = [makeFighter(la, false, papers[0]), makeFighter(lb, true, papers[1])];
    scene.add(...fighters);
    shadowDirty();
  }

  // 記録の1こま（a の x・y・回転, b の x・y・回転, 土俵の上の面の y, ふれているか）
  let ry = 0;
  function setFrame(f, o) {
    if (f[o + 6] !== ry) shadowDirty();
    ry = f[o + 6];
    for (let i = 0; i < 2; i++) {
      const m = fighters[i], x = f[o + i * 3], y = f[o + i * 3 + 1] - ry, rz = f[o + i * 3 + 2];
      if (x !== m.position.x || y !== m.position.y || rz !== m.rotation.z) shadowDirty();
      m.position.set(x, y, 0);
      m.rotation.z = rz;
    }
    dohyo.userData.floor.position.y = -P.ringDepth - ry; // 床は動かない（土俵だけがトンと上がる）
    if (venue) venue.position.y = -P.ringDepth - ry;      // 会場の飾りも床といっしょ
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height), pr = Math.min(window.devicePixelRatio || 1, LOOK.maxDpr);
    // 大きさが同じなら、描く板を作りなおさない（取組のたびに作りなおすと重い・11/25）
    if (w !== cssW || h !== cssH || pr !== renderer.getPixelRatio()) {
      cssW = w; cssH = h;
      if (pr !== renderer.getPixelRatio()) renderer.setPixelRatio(pr);
      renderer.setSize(cssW, cssH, false);
    }
    camera.aspect = cssW / cssH;
    const tv = Math.tan((LOOK.fov * D2R) / 2), th = tv * camera.aspect;
    base = Math.max(LOOK.viewHalfW / th, LOOK.viewHalfH / tv);
    camera.updateProjectionMatrix();
    if (scene.fog) { scene.fog.near = base * 0.9; scene.fog.far = base * 2.2; }
    layoutVenue();
  }

  // カメラ：az＝まわりの角度（0＝真横の正面）・elev＝見下ろす角度（度）・far＝遠さの倍率
  function view(az, elev, far) {
    const e = elev * D2R, r = base * far;
    camera.position.set(Math.sin(az) * Math.cos(e) * r, LOOK.lookY + Math.sin(e) * r, Math.cos(az) * Math.cos(e) * r);
    camera.lookAt(0, LOOK.lookY, 0);
  }

  const v3 = new THREE.Vector3();
  // 描く座標（土俵の上の面が y=0）→ 画面の CSS ピクセル
  function project(x, y, z = 0) {
    v3.set(x, y, z).project(camera);
    return [((v3.x + 1) / 2) * cssW, ((1 - v3.y) / 2) * cssH, v3.z < 1];
  }

  function render() { renderer.render(scene, camera); }

  setDohyo(DOHYO_DEFAULT);
  return {
    setDohyo, setVenue, venueTime, venueTick, venueCheer, venueCues, setFighters, setFrame, resize, view, project, render,
    get ry() { return ry; },
    look: () => dohyo.userData.look,
  };
}
