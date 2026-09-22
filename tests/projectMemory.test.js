const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { collect, normalize } = require('../scripts/fetchMemoryTranscripts');
const { buildCatalog } = require('../scripts/buildMemoryCatalog');
const { enrich } = require('../scripts/enrichMemoryCatalog');
const { candidates, requestFor, extract, searchIndex } = require('../scripts/buildProjectMemory');

const id = 'aaaaaaaaaaa';
test('公開一覧と古い控えを照合し、日付のない動画を未取得とする', () => {
  const videos = buildCatalog({ entries: [{ id, title: '新しいタイトル' }, { id: 'bbbbbbbbbbb', title: '新規' }, { id }] },
    [{ id, title: '古いタイトル', publishedAt: '2023-01-01', description: '概要' }]);
  assert.equal(videos.length, 2);
  assert.equal(videos[0].title, '新しいタイトル');
  assert.equal(videos[0].description, '概要');
  assert.equal(videos[1].publishedAt, null);
});
test('公式APIによる詳細更新はチャンネルと公開状態を検査し、秘密を表示しない', async () => {
  const urls = [];
  const fetcher = async url => {
    urls.push(url);
    if (url.pathname.endsWith('channels')) return { ok: true, json: async () => ({ items: [{ id: 'UCown' }] }) };
    return { ok: true, json: async () => ({ items: [{ id, snippet: { channelId: 'UCown', title: '現行', description: '更新', publishedAt: '2025-01-01' }, status: { privacyStatus: 'public' } }] }) };
  };
  const result = await enrich({ videos: [{ id, title: '旧' }, { id: 'bbbbbbbbbbb' }] }, 'secret', fetcher);
  assert.equal(result.videos.length, 1);
  assert.equal(result.videos[0].description, '更新');
  assert.equal(result.videos[0].thumbnail, `https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
  assert.equal(urls.length, 2);
  assert.equal(urls[1].searchParams.get('part'), 'snippet,status');
  await assert.rejects(enrich({ videos: [{ id }] }, 'secret', async () => ({ ok: false, status: 403 })), e => !e.message.includes('secret'));
});
test('字幕収集は上限、重複除去、失敗の記録と再実行時のスキップを守る', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-test-'));
  try {
    const calls = [];
    const fetchOne = async key => { calls.push(key); return key === id ? { rows: [{ start: 2, end: 3, text: 'LNAを測定' }], method: 'test', language: 'ja' } : null; };
    const opts = { output: dir, limit: 2, delay: 0 };
    assert.deepEqual((await collect([id, id, 'bbbbbbbbbbb', 'ccccccccccc'], opts, fetchOne)).attempted, 2);
    assert.deepEqual(calls, [id, 'bbbbbbbbbbb']);
    await collect([id, 'bbbbbbbbbbb'], opts, fetchOne);
    assert.equal(calls.length, 2);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json')));
    assert.equal(manifest[id].status, 'available');
    assert.equal(manifest.bbbbbbbbbbb.status, 'unavailable');
    await assert.rejects(collect(['bad/id'], opts, fetchOne));
    assert.throws(() => normalize([{ start: 4, duration: 1, text: 'a' }, { start: 3, duration: 1, text: 'b' }]));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('取得不能が連続したら5件で停止する', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-breaker-'));
  let calls = 0;
  try {
    const ids = Array.from({ length: 9 }, (_, i) => String(i).padStart(11, 'a'));
    const result = await collect(ids, { output: dir, limit: 9, delay: 0 }, async () => { calls++; return null; });
    assert.equal(result.attempted, 5);
    assert.equal(calls, 5);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('プロジェクトの根拠とイベントを同一区間に限定する', () => {
  const video = { id, title: 'LNAを作りたい', description: 'LNAを完成しました。', publishedAt: '2024-01-01' };
  const { keys, units } = candidates(video, [{ start: 0, end: 2, text: 'LNAの計画' }, { start: 4, end: 7, text: '次は測定' }]);
  assert.ok(keys.includes('lna'));
  const request = requestFor(video, [units[0]], keys);
  assert.match(request.questions.title_project_lna.instructions, /ONLY state.units\["title"\]/);
  const result = extract(video, [units[0]], keys, [{ answers: { title_project_lna: { noul: .9 }, title_plan: { noul: .9 } } }]);
  assert.equal(result.evidence[0].events.plan, .9);
  assert.equal(result.evidence[0].events.completed, undefined);
});
test('字幕検索の文字位置を再生時刻に対応付ける', () => {
  const index = searchIndex([{ start: 2, text: '最初の話' }, { start: 63, text: 'ガードリングを測定' }]);
  const position = index.searchText.indexOf('ガードリング');
  const offsets = index.searchOffsets.split(';').map(pair => pair.split(',').map(Number));
  assert.equal(offsets.findLast(([offset]) => offset <= position)[1], 63);
});
