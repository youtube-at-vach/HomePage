const assert = require('node:assert/strict');
const test = require('node:test');
const { fetchLatestVideos } = require('../scripts/fetchVideos');

test('概要欄の最新版を取得し、他チャンネルと非公開動画を除外する', async () => {
  const calls = [];
  const responses = {
    channels: { items: [{ id: 'UCtest', contentDetails: { relatedPlaylists: { uploads: 'UUtest' } } }] },
    playlistItems: { items: ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'].map(videoId => ({ contentDetails: { videoId } })) },
    videos: { items: [
      { id: 'aaaaaaaaaaa', status: { privacyStatus: 'public' }, snippet: { channelId: 'UCtest', title: '古い動画', description: '更新後の概要欄', publishedAt: '2026-01-01T00:00:00Z' } },
      { id: 'bbbbbbbbbbb', status: { privacyStatus: 'private' }, snippet: { channelId: 'UCtest', title: '非公開', publishedAt: '2026-02-01T00:00:00Z' } },
      { id: 'ccccccccccc', status: { privacyStatus: 'public' }, snippet: { channelId: 'UCother', title: '別チャンネル', publishedAt: '2026-03-01T00:00:00Z' } }
    ] }
  };
  const fetcher = async url => {
    calls.push(url);
    return { ok: true, json: async () => responses[url.pathname.split('/').at(-1)] };
  };
  const result = await fetchLatestVideos('test-key', '@va-ch', fetcher);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].searchParams.get('forHandle'), 'va-ch');
  assert.equal(calls[1].searchParams.get('playlistId'), 'UUtest');
  assert.equal(calls[2].searchParams.get('part'), 'snippet,status');
  assert.deepEqual(result.videos.map(video => video.id), ['aaaaaaaaaaa']);
  assert.equal(result.videos[0].description, '更新後の概要欄');
  assert.ok(!JSON.stringify(result).includes('test-key'));
});

test('API エラーでもキーをエラーメッセージに含めない', async () => {
  await assert.rejects(
    fetchLatestVideos('secret-key', 'va-ch', async () => ({ ok: false, status: 403 })),
    error => error.message === 'YouTube API channels: HTTP 403' && !error.message.includes('secret-key')
  );
});
