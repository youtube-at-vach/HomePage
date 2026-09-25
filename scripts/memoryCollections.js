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
// Editorial history supported by technical-video captions. Each link opens at the
// cited caption time; lyrics and music-first videos are intentionally excluded.
const STV_HISTORY = [
  { title: 'STV1試作以前の目標を振り返る', text: '過去のSTV1プロトタイプに立ち戻り、次のマイクに必要な設計条件を考えています。', sources: [{ id: '4DQODE8Cr60', start: 14 }] },
  { title: 'ICS-40800の指向性マイクにEQ補正を検討', text: '指向性マイクの周波数特性をイコライザーで補正する案をシミュレーションしています。', sources: [{ id: 'HXrNXpMIlqo', start: 24 }] },
  { title: 'マイクユニットとプリアンプを分けた構造へ', text: '新しいマイクユニットを別体のプリアンプと組み合わせ、ケース内のシールドも検討しています。', sources: [{ id: 'x4DxEjURTss', start: 359 }, { id: 'x4DxEjURTss', start: 792 }] },
  { title: 'STV1のプリアンプにEQを組み込む案', text: '既存プリアンプに部品を加え、EQ回路を内部に取り込めるか確かめています。', sources: [{ id: 'a_Rto_rcj8w', start: 590 }] },
  { title: 'STV2のプリアンプ仕様を決定', text: '通常版・高感度版などの構成を比較し、STV2の仕様を決めて基板製作へ進む段階を記録しています。', sources: [{ id: '7yIoNDGwvyw', start: 897 }] },
  { title: '基板実装とノイズ対策を詰める', text: 'STV2基板では大容量コンデンサーを含む構成とノイズ対策を検討しています。', sources: [{ id: '4UHAWGvtR6Q', start: 747 }, { id: '4UHAWGvtR6Q', start: 889 }] },
  { title: 'STV2でノイズフィルターを試す', text: 'STV1からSTV2へ移った理由や、マイク回路に加えるフィルターを検討しています。', sources: [{ id: 'd1S4WAG8VtA', start: 290 }, { id: 'd1S4WAG8VtA', start: 555 }] },
  { title: 'ICS-40800を使うSTV2マイクモジュールを組む', text: '新しいマイクモジュールが形になり、フェライトビーズなどの影響を試す段階へ進んでいます。', sources: [{ id: 'egpsUx9G9NU', start: 167 }] },
  { title: 'MEMSマイク基板のリフロー手順を記録', text: '基板を使ったMEMSマイクのリフロー実装方法を紹介しています。', sources: [{ id: 'gdS_PLJqASQ', start: 55 }] },
  { title: 'DC結合マイクの試作に挑戦', text: 'DCマイクの音を確かめながら回路を試しています。本人も安定性を課題として挙げており、完成確定とは扱いません。', sources: [{ id: '4ge13jgTUjM', start: 147 }] },
  { title: 'STV2 DC版をREWで測定', text: 'REWを使った測定で、STV2 DCバージョンを試験対象にしています。', sources: [{ id: '0tLL-NH_Ae8', start: 453 }] },
  { title: 'STV2 AC版の高調波測定', text: '高調波測定プログラムでSTV2 AC版を測定した記録があります。', sources: [{ id: 'VRprwYMcrAk', start: 396 }] },
  { title: '後日談：STV2 DCと自動オフセットの検討', text: '2025年の振り返りでは、STV2 DC系統と自動オフセットを含む次の試作を説明しています。', sources: [{ id: 'jYn1c9SyDhg', start: 621 }] },
  { title: '関連するLNAの発振対策でSTV2の検討を再訪', text: '後年のLNA動画で、以前STV2入力にフェライトビーズを入れる案を検討したことに触れています。これは両作業の技術的な接点を示す記録です。', sources: [{ id: 'yQ5fsI_TKy4', start: 142 }] }
];
// Short editorial reading guide. Keep each statement tied to caption timestamps;
// this describes recorded work, not the current completion state of a project.
const STV_OVERVIEW = [
  { text: 'STV1の目標を振り返った後、ICS-40800を使うSTV2の仕様、基板、マイクモジュールへと製作を進めています。', sources: [{ id: '4DQODE8Cr60', start: 14 }, { id: '7yIoNDGwvyw', start: 897 }, { id: 'egpsUx9G9NU', start: 167 }] },
  { text: '指向性マイクのEQ補正、ケースのシールド、ノイズフィルターを、それぞれ設計・試験の課題として扱っています。', sources: [{ id: 'HXrNXpMIlqo', start: 24 }, { id: 'x4DxEjURTss', start: 792 }, { id: 'd1S4WAG8VtA', start: 555 }] },
  { text: 'DC結合版の試作を進め、STV2 DC版はREWで、AC版は高調波測定で検証しています。後の振り返りでは、自動オフセットを含む次の試作を検討しています。', sources: [{ id: '4ge13jgTUjM', start: 147 }, { id: '0tLL-NH_Ae8', start: 453 }, { id: 'VRprwYMcrAk', start: 396 }, { id: 'jYn1c9SyDhg', start: 621 }] }
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
    milestones: MILESTONES.filter(([id]) => videoIds.includes(id)).map(([id, caption]) => ({ id, caption })),
    overview: STV_OVERVIEW.filter(item => item.sources.every(source => byId.has(source.id))),
    history: STV_HISTORY.filter(item => item.sources.every(source => byId.has(source.id)))
  }] : [];
  const priority = ['series:mems', ...playlists.filter(p => /オリジナル曲/.test(p.title)).map(p => p.id),
    ...playlists.filter(p => /Producer\.AI/.test(p.title)).map(p => p.id), `playlist:${MEMS_PLAYLIST}`];
  return [...series, ...playlists].sort((a, b) => {
    const ai = priority.indexOf(a.id), bi = priority.indexOf(b.id);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}
module.exports = { buildCollections, MEMS_PLAYLIST };
