#!/usr/bin/env node
// Public uploads and the channel's own playlists, using only YouTube Data API v3.
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const API = 'https://www.googleapis.com/youtube/v3/';
const thumbnailUrl = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

async function fetchArchive(apiKey, handle = 'va-ch', fetcher = fetch, previous = null) {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY が必要です');
  async function request(endpoint, params) {
    const url = new URL(endpoint, API);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set('key', apiKey);
    let response;
    try { response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000) }); }
    catch { throw new Error(`YouTube ${endpoint}: 通信失敗。既存データは保持します。`); }
    if (!response.ok) throw new Error(`YouTube ${endpoint}: HTTP ${response.status}。既存データは保持します。`);
    return response.json();
  }
  async function pages(endpoint, params, maxPages) {
    const items = [];
    let pageToken;
    for (let page = 0; page < maxPages; page++) {
      const response = await request(endpoint, { ...params, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
      items.push(...response.items || []);
      pageToken = response.nextPageToken;
      if (!pageToken) return items;
    }
    throw new Error(`YouTube ${endpoint}: ページ上限に達しました。既存データは保持します。`);
  }
  const channel = (await request('channels', { part: 'contentDetails', forHandle: handle.replace(/^@/, ''), maxResults: '1' })).items?.[0];
  const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channel?.id || !uploadsId) throw new Error('チャンネルを確認できません');
  const uploads = await pages('playlistItems', { part: 'contentDetails', playlistId: uploadsId }, 20);
  const ids = [...new Set(uploads.map(x => x.contentDetails?.videoId).filter(x => /^[\w-]{11}$/.test(x)))];
  if (!ids.length || ids.length > 1000) throw new Error('公開動画の一覧を確認できません');
  const allPlaylists = await pages('playlists', { part: 'snippet,contentDetails,status', channelId: channel.id }, 4);
  const playlistItems = [];
  for (const playlist of allPlaylists) {
    if (playlist.status?.privacyStatus !== 'public') continue;
    const entries = await pages('playlistItems', { part: 'contentDetails', playlistId: playlist.id }, 20);
    playlistItems.push({ playlist, ids: [...new Set(entries.map(x => x.contentDetails?.videoId).filter(x => /^[\w-]{11}$/.test(x)))] });
  }
  const previousVideos = previous?.channelId === channel.id && Array.isArray(previous.videos)
    ? new Map(previous.videos.filter(v => /^[\w-]{11}$/.test(v.id) && v.title && v.publishedAt).map(v => [v.id, v])) : new Map();
  // Always refresh the latest 50 and new uploads. Older entries come from the
  // last published API snapshot; the complete uploads list still detects removals.
  const toRefresh = ids.filter((id, index) => index < 50 || !previousVideos.has(id));
  const details = new Map();
  for (let i = 0; i < toRefresh.length; i += 50) {
    const response = await request('videos', { part: 'snippet,status', id: toRefresh.slice(i, i + 50).join(',') });
    for (const item of response.items || []) {
      if (item.snippet?.channelId === channel.id && item.status?.privacyStatus === 'public') details.set(item.id, item);
    }
  }
  if (!details.size) throw new Error('公開動画を確認できません。既存データは保持します。');
  const generatedAt = new Date().toISOString();
  const videos = ids.filter(id => details.has(id) || previousVideos.has(id)).map(id => {
    const current = details.get(id)?.snippet;
    const s = current || previousVideos.get(id);
    return { id, title: s.title, description: s.description || '', publishedAt: s.publishedAt,
      thumbnail: current?.thumbnails?.medium?.url || current?.thumbnails?.default?.url || s.thumbnail || thumbnailUrl(id),
      metadataSource: 'youtube-data-api', url: `https://www.youtube.com/watch?v=${id}` };
  });
  // A playlist may include another channel's video: retain its link, but never
  // present it as this channel's project history.
  const playlists = playlistItems.map(({ playlist, ids: members }) => ({
    id: playlist.id, title: playlist.snippet.title, description: playlist.snippet.description || '',
    url: `https://www.youtube.com/playlist?list=${playlist.id}`,
    videoIds: members.filter(id => details.has(id) || previousVideos.has(id))
  }));
  return { generatedAt, channelId: channel.id, videos, playlists };
}

async function main() {
  const { values } = parseArgs({ options: {
    output: { type: 'string', default: path.join(ROOT, '.local/memory-catalog.json') },
    handle: { type: 'string', default: 'va-ch' },
    reuse: { type: 'string' }
  } });
  const previous = values.reuse ? JSON.parse(await fs.readFile(values.reuse)) : null;
  const result = await fetchArchive(process.env.YOUTUBE_API_KEY, values.handle, fetch, previous);
  await fs.mkdir(path.dirname(values.output), { recursive: true });
  const temp = `${values.output}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(result, null, 2) + '\n');
  await fs.rename(temp, values.output);
  console.log(`${result.videos.length}本・公開プレイリスト${result.playlists.length}件を ${values.output} に保存しました。`);
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { fetchArchive };
