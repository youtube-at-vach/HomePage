const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchArchive } = require('../scripts/fetchChannelArchive');
const { buildCollections, MEMS_PLAYLIST } = require('../scripts/memoryCollections');
const { publish } = require('../scripts/publishChannelArchive');
const a = 'aaaaaaaaaaa', b = 'bbbbbbbbbbb', foreign = 'ccccccccccc';
test('公式APIのアップロード・公開リストを照合し、他チャンネルや非公開を除く', async () => {
  const calls = [];
  const fetcher = async url => {
    calls.push({ endpoint: url.pathname.split('/').at(-1), page: url.searchParams.get('pageToken') });
    const endpoint = calls.at(-1).endpoint;
    let body;
    if (endpoint === 'channels') body = { items: [{ id: 'UCown', contentDetails: { relatedPlaylists: { uploads: 'UUown' } } }] };
    if (endpoint === 'playlists') body = { items: [{ id: MEMS_PLAYLIST, snippet: { title: '自作MEMSマイクへの道' }, status: { privacyStatus: 'public' } },
      { id: 'PLprivate', status: { privacyStatus: 'private' } }] };
    if (endpoint === 'playlistItems') body = url.searchParams.get('playlistId') === 'UUown'
      ? url.searchParams.has('pageToken') ? { items: [{ contentDetails: { videoId: b } }] }
        : { items: [{ contentDetails: { videoId: a } }], nextPageToken: 'next' }
      : { items: [a, b, foreign].map(videoId => ({ contentDetails: { videoId } })) };
    if (endpoint === 'videos') body = { items: [a, b, foreign].map(id => ({ id,
      snippet: { title: id === a ? '自作MEMSマイクへの道' : id, description: '', publishedAt: '2024-01-01', channelId: id === foreign ? 'UCother' : 'UCown' },
      status: { privacyStatus: 'public' } })) };
    return { ok: true, json: async () => body };
  };
  const catalog = await fetchArchive('secret', 'va-ch', fetcher);
  assert.deepEqual(catalog.videos.map(v => v.id), [a, b]);
  assert.deepEqual(catalog.playlists[0].videoIds, [a, b]);
  assert.equal(calls.filter(c => c.endpoint === 'playlistItems').length, 3);
  assert.equal(calls.filter(c => c.endpoint === 'videos').length, 1);
  const prior = { channelId: 'UCown', videos: [{ id: b, title: '保存済み', description: '既存の説明', publishedAt: '2023-01-01' }] };
  const incremental = await fetchArchive('secret', 'va-ch', fetcher, prior);
  assert.equal(incremental.videos[1].title, b, '直近50本は常に再取得する');
  await assert.rejects(fetchArchive('secret', 'va-ch', async () => ({ ok: false, status: 403 })), e => !e.message.includes('secret'));
});
test('50本より古い既存情報は再取得せず、新規分だけ確認する', async () => {
  const ids = Array.from({ length: 52 }, (_, i) => String(i).padStart(11, '0'));
  let requested = [];
  const fetcher = async url => {
    let body;
    switch (url.pathname.split('/').at(-1)) {
      case 'channels': body = { items: [{ id: 'UCown', contentDetails: { relatedPlaylists: { uploads: 'UUown' } } }] }; break;
      case 'playlists': body = { items: [] }; break;
      case 'playlistItems': body = { items: ids.map(videoId => ({ contentDetails: { videoId } })) }; break;
      case 'videos': {
        const batch = url.searchParams.get('id').split(',');
        requested.push(...batch);
        body = { items: batch.map(id => ({ id, snippet: { channelId: 'UCown', title: id, description: '', publishedAt: '2024-01-01' }, status: { privacyStatus: 'public' } })) };
      }
    }
    return { ok: true, json: async () => body };
  };
  const prior = { channelId: 'UCown', videos: ids.slice(0, 51).map(id => ({ id, title: '保存済み', description: '', publishedAt: '2024-01-01' })) };
  const result = await fetchArchive('secret', 'va-ch', fetcher, prior);
  assert.equal(requested.length, 50 + 1);
  assert.equal(result.videos[50].title, '保存済み');
  assert.equal(result.videos[51].title, ids[51]);
});
test('本編はプレイリスト中のタイトルと指定前史のみ、楽曲リストは独立', () => {
  const catalog = { videos: [{ id: a, title: '自作MEMSマイクへの道 開演' }, { id: b, title: '関係のないAI動画' }],
    playlists: [{ id: MEMS_PLAYLIST, title: '自作MEMSマイクへの道', url: 'https://www.youtube.com/playlist?list=' + MEMS_PLAYLIST, videoIds: [a, b] },
      { id: 'PLmusic', title: 'デジタルな夜 - オリジナル曲', videoIds: [b], url: 'https://www.youtube.com/playlist?list=PLmusic' }] };
  const groups = buildCollections(catalog);
  assert.deepEqual(groups.find(g => g.id === 'series:mems').videoIds, [a]);
  assert.deepEqual(groups.find(g => g.id === `playlist:${MEMS_PLAYLIST}`).videoIds, [a, b]);
  assert.deepEqual(groups.find(g => g.id === 'playlist:PLmusic').videoIds, [b]);
});
test('週次更新は同一メタデータだけJev根拠を再利用し、検索字幕は保持する', () => {
  const catalog = { channelId: 'UCown', videos: [
    { id: a, title: '新題', description: '更新', publishedAt: '2025-01-01', url: `https://www.youtube.com/watch?v=${a}` },
    { id: b, title: 'そのまま', description: '', publishedAt: '2024-01-01', url: `https://www.youtube.com/watch?v=${b}` }], playlists: [] };
  const old = { projects: { mic: '自作マイク' }, videos: [
    { id: a, title: '旧題', description: '更新', publishedAt: '2025-01-01', analyzed: true, transcript: true, searchText: '字幕', searchOffsets: '0,3', projects: ['mic'], evidence: [{ text: '旧題' }] },
    { id: b, title: 'そのまま', description: '', publishedAt: '2024-01-01', analyzed: true, projects: ['mic'], evidence: [{ text: '原文' }] }] };
  const { memory, latest } = publish(catalog, old);
  assert.equal(memory.videos[0].analyzed, false);
  assert.deepEqual(memory.videos[0].evidence, []);
  assert.equal(memory.videos[0].searchText, '字幕');
  assert.equal(memory.videos[1].analyzed, true);
  assert.equal(memory.videos[1].evidence[0].text, '原文');
  assert.equal(latest.videos.length, 2);
});
