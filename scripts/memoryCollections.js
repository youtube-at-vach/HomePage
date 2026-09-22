// Editorial navigation anchored to public playlist membership and video titles.
const MEMS_PLAYLIST = 'PLgAu8U6bu23n5Jx2t9K27e3NCa9RDBQU6';
const PRELUDE = ['cinSwN29lo8', '1COPz_agjhg', 'zng4PcdFNG0'];
const FOLLOW_UP = ['4-UjO1Ce3IQ'];
const MILESTONES = [
  ['cinSwN29lo8', 'MEMSセル到着：製作の出発点'],
  ['1COPz_agjhg', 'はんだ付けの失敗を記録'],
  ['zng4PcdFNG0', '低歪みマイクアンプ搭載機の完成報告'],
  ['TYAGTyVA0BE', '「自作MEMSマイクへの道」開演'],
  ['zhOYF42Mvno', '基板パターンのミスを発見'],
  ['_Eklwbagcms', '新構造と課題を検討'],
  ['LhcPZzKHE8Y', 'STV2プロトタイプの完成報告'],
  ['4ge13jgTUjM', 'プリアンプのDC化に挑戦'],
  ['hdLrSdQvCmM', 'DCプリアンプを使った新型マイク製作'],
  ['4-UjO1Ce3IQ', 'DC MEMSマイクでステレオ録音を検証']
];
function buildCollections(catalog) {
  const byId = new Map(catalog.videos.map(v => [v.id, v]));
  const descriptionFor = title => {
    if (title === 'デジタルな夜 - オリジナル曲集') return 'チャンネルが「曲集」としてまとめた作品です。個別曲のリストとは別に掲載し、同じ動画を二重に数えません。';
    if (title === 'デジタルな夜 - オリジナル曲') return 'チャンネルが選んだオリジナル曲のリストです。曲名・公開日を軸にたどれます。制作手法は動画ごとの説明欄で確認してください。';
    if (/Producer\.AI/.test(title)) return 'Producer.AIでの音楽・自然音生成の実験です。公開した曲のリストとは分けて掲載します。';
    if (title === '自作MEMSマイクへの道') return 'チャンネルが整理した広いプレイリストです。MEMSマイク以外の測定・AI開発動画も含むため、本編とは分けて表示します。';
    return 'チャンネルが公開しているプレイリストです。';
  };
  const playlists = (catalog.playlists || []).filter(p => /^PL[\w-]+$/.test(p.id)).map(p => ({
    id: `playlist:${p.id}`, title: p.title, kind: 'playlist', url: p.url,
    videoIds: [...new Set(p.videoIds)].filter(id => byId.has(id)),
    description: descriptionFor(p.title)
  })).filter(p => p.videoIds.length);
  const mems = playlists.find(p => p.id === `playlist:${MEMS_PLAYLIST}`);
  const seriesIds = mems ? mems.videoIds.filter(id => /自作MEMSマイクへの道/.test(byId.get(id).title)) : [];
  const videoIds = [...new Set([...PRELUDE.filter(id => mems?.videoIds.includes(id)), ...seriesIds,
    ...FOLLOW_UP.filter(id => mems?.videoIds.includes(id))])];
  const series = videoIds.length ? [{ id: 'series:mems', kind: 'series', title: '自作MEMSマイクへの道・本編と前史',
    description: 'タイトルに「自作MEMSマイクへの道」とある動画と、同じ公式プレイリストに入る製作前史3本・後続の録音検証1本を時系列でたどります。プレイリスト全体には周辺活動も含まれます。',
    videoIds, playlistId: mems.id,
    milestones: MILESTONES.filter(([id]) => videoIds.includes(id)).map(([id, caption]) => ({ id, caption }))
  }] : [];
  const priority = ['series:mems', ...playlists.filter(p => /オリジナル曲/.test(p.title)).map(p => p.id),
    ...playlists.filter(p => /Producer\.AI/.test(p.title)).map(p => p.id), `playlist:${MEMS_PLAYLIST}`];
  return [...series, ...playlists].sort((a, b) => {
    const ai = priority.indexOf(a.id), bi = priority.indexOf(b.id);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}
module.exports = { buildCollections, MEMS_PLAYLIST };
