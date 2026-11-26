// 力士の紙質（11/26 しょーくん：福箱から出る・見た目だけ）。重さ・すべり・当たりは一切変わらない（物理は形だけを見る）。
// 描くのは ui/papertex.js。tex があれば Codex のテクスチャ（A・assets/art/<tex>.webp・つなぎ目なし）をくり返して塗る（11/26・13種ぜんぶ）。
//   ないときと、読みこむ前は、コードで描くもよう（C）。texSpan：テクスチャ1枚が紙の幅のどれだけか
//   base：紙の色・fiber：和紙のすじの濃さ（1＝ふつう）・pat：もよう・ink：もようの色
//   もよう：wara 藁のつぶ／asanoha 麻の葉／seigaiha 青海波／ichimatsu 市松／shinbun 新聞／suminagashi 墨流し／kira 雲母／kinpaku 金箔
export const PAPERS = {
  p_washi: { name: '和紙', base: '#EEE9DE', fiber: 1, tex: 'tex-washi', texSpan: 0.7 },
  p_hanshi: { name: '半紙', base: '#F7F5EF', fiber: 0.35, tex: 'tex-hanshi', texSpan: 0.7 },
  p_wara: { name: '藁半紙', base: '#DDD0B3', fiber: 1.3, pat: 'wara', ink: '#8a7653', tex: 'tex-wara', texSpan: 0.7 },
  p_sakura: { name: '桜の和紙', base: '#F2DCDB', fiber: 1, tex: 'tex-sakura', texSpan: 0.7 },
  p_wakakusa: { name: '若草の和紙', base: '#DEE4C9', fiber: 1, tex: 'tex-wakakusa', texSpan: 0.7 },
  p_ai: { name: '藍の和紙', base: '#BCC8D8', fiber: 1, tex: 'tex-ai', texSpan: 0.7 },
  p_asanoha: { name: '千代紙・麻の葉', base: '#EED9D3', fiber: 0.4, pat: 'asanoha', ink: '#AB392F', tex: 'tex-asanoha', texSpan: 0.35 },
  p_seigaiha: { name: '千代紙・青海波', base: '#DCE3EA', fiber: 0.4, pat: 'seigaiha', ink: '#3E5A78', tex: 'tex-seigaiha', texSpan: 0.5 },
  p_ichimatsu: { name: '千代紙・市松', base: '#EEE9DE', fiber: 0.4, pat: 'ichimatsu', ink: '#3D6B4F', tex: 'tex-ichimatsu', texSpan: 0.9 },
  p_shinbun: { name: '新聞紙', base: '#E4E0D5', fiber: 0.5, pat: 'shinbun', ink: '#4a4640', tex: 'tex-shinbun', texSpan: 0.8 },
  p_suminagashi: { name: '墨流し', base: '#EEE9DE', fiber: 0.6, pat: 'suminagashi', ink: '#201E1B', tex: 'tex-suminagashi', texSpan: 0.8 },
  p_kira: { name: '雲母刷り', base: '#E6E2EC', fiber: 0.5, pat: 'kira', ink: '#FFFFFF', tex: 'tex-kira', texSpan: 0.8 },
  p_kinpaku: { name: '金箔', base: '#C9A445', fiber: 0, pat: 'kinpaku', ink: '#8a6d24', tex: 'tex-kinpaku', texSpan: 0.8 },
};
export const PAPER_DEFAULT = 'p_washi';
