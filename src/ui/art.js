// 絵：ビルドが media/art/*.webp を assets/<名前>.<印>.webp に置き、window.SUMO_ASSETS.art に名前 → パスを書く（11/28〜・D）。
// 前の形（絵ごとの script に base64）も読める。
// 開いたときにぜんぶ画像にしないで、使うときに1枚ずつ blob URL の画像にする（code-rules C・起動を軽く）。
// 画像にしたら、その script は消す（base64 の文字をメモリに残さない）。decode() で描く前にほどいておく（はじめて描くときにかたまらない）。
import { fromBase64 } from './unpack.js';

const cache = {};

export function artImage(id) {
  if (cache[id]) return cache[id];
  const url = window.SUMO_ASSETS && window.SUMO_ASSETS.art[id];
  if (url) {   // 出口の横の assets/ の絵（11/28〜・D）。名前に中身の印があるので、ずっとキャッシュしてよい
    cache[id] = new Promise((ok, ng) => {
      const im = new Image();
      im.src = url;
      const done = () => ok(im);
      if (im.decode) im.decode().then(done, () => { im.complete && im.naturalWidth ? done() : ng(new Error(`絵がひらけない：${id}`)); });
      else { im.onload = done; im.onerror = ng; }
    });
    cache[id].catch(() => { delete cache[id]; });
    return cache[id];
  }
  const el = document.getElementById('art-' + id);
  if (!el) return Promise.reject(new Error(`絵がない：${id}`));   // まだ読みこまれていない（つぎに呼ばれたときにもう一度さがす）
  cache[id] = new Promise((ok, ng) => {
    const u = fromBase64(el.textContent.trim());
    el.remove();
    const im = new Image();
    im.src = URL.createObjectURL(new Blob([u], { type: 'image/webp' }));
    const done = () => ok(im);
    if (im.decode) im.decode().then(done, () => { im.complete && im.naturalWidth ? done() : ng(new Error(`絵がひらけない：${id}`)); });
    else { im.onload = done; im.onerror = ng; }
  });
  cache[id].catch(() => { delete cache[id]; });
  return cache[id];
}

// 名前の一覧 → { 名前: 画像 }
export async function artImages(ids) {
  const list = await Promise.all(ids.map(artImage));
  const out = {};
  ids.forEach((id, i) => { out[id] = list[i]; });
  return out;
}
