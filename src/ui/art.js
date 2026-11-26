// 絵（assets/art/*.webp）。ビルドが <script type="application/json" id="lib-art"> に { "<名前>": "<base64>" } を入れる。
// 開いたときにぜんぶ画像にしないで、使うときに1枚ずつ blob URL にする（code-rules C・起動を軽く）。
let SRC = null;
const cache = {};

function src() {
  if (SRC) return SRC;
  const el = document.getElementById('lib-art');
  if (!el) return {};   // まだ読みこまれていない（つぎに呼ばれたときにもう一度さがす）
  SRC = JSON.parse(el.textContent);
  el.remove();
  return SRC;
}

export function artImage(id) {
  if (cache[id]) return cache[id];
  cache[id] = new Promise((ok, ng) => {
    const b64 = src()[id];
    if (!b64) { delete cache[id]; ng(new Error(`絵がない：${id}`)); return; }
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = ng;
    im.src = URL.createObjectURL(new Blob([u], { type: 'image/webp' }));
  });
  return cache[id];
}

// 名前の一覧 → { 名前: 画像 }
export async function artImages(ids) {
  const list = await Promise.all(ids.map(artImage));
  const out = {};
  ids.forEach((id, i) => { out[id] = list[i]; });
  return out;
}
