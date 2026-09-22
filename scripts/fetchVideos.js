#!/usr/bin/env node
// 公開動画の最新情報を YouTube Data API から取得し、静的サイト用 JSON を作る。
const fs = require('node:fs/promises');
const path = require('node:path');

const API_ROOT = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_HANDLE = 'va-ch';
const MAX_VIDEOS = 12;

async function request(endpoint, params, apiKey, fetcher = fetch) {
  const url = new URL(`${API_ROOT}/${endpoint}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('key', apiKey);
  let response;
  try {
    response = await fetcher(url);
  } catch {
    throw new Error(`YouTube API ${endpoint}: 通信に失敗しました。`);
  }
  if (!response.ok) {
    // Google のエラー本文には認証情報が入る場合があるため表示しない。
    throw new Error(`YouTube API ${endpoint}: HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchLatestVideos(apiKey, handle = DEFAULT_HANDLE, fetcher = fetch) {
  const channels = await request('channels', {
    part: 'contentDetails', forHandle: handle.replace(/^@/, ''), maxResults: '1'
  }, apiKey, fetcher);
  const channel = channels.items?.[0];
  const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channel?.id || !uploadsId) throw new Error(`チャンネル @${handle} が見つかりません。`);

  const ids = [];
  let pageToken;
  do {
    const page = await request('playlistItems', {
      part: 'contentDetails', playlistId: uploadsId,
      maxResults: String(MAX_VIDEOS - ids.length),
      ...(pageToken ? { pageToken } : {})
    }, apiKey, fetcher);
    for (const item of page.items || []) {
      const id = item.contentDetails?.videoId;
      if (id && !ids.includes(id)) ids.push(id);
    }
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < MAX_VIDEOS);

  if (!ids.length) throw new Error('公開動画が見つからなかったため、既存データを保持します。');
  // playlistItems の説明文は古いことがあるため videos.list の現行 snippet を使う。
  const details = await request('videos', {
    part: 'snippet,status', id: ids.join(',')
  }, apiKey, fetcher);
  const videosById = new Map((details.items || []).map(item => [item.id, item]));
  const videos = ids.map(id => videosById.get(id))
    .filter(item => item?.status?.privacyStatus === 'public' && item.snippet?.channelId === channel.id)
    .map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description || '',
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      url: `https://www.youtube.com/watch?v=${item.id}`
    }))
    .filter(item => item.title && item.publishedAt)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  if (!videos.length) throw new Error('公開動画の詳細が取得できなかったため、既存データを保持します。');
  return { channelId: channel.id, channelUrl: `https://www.youtube.com/@${handle.replace(/^@/, '')}`, videos };
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY を環境変数に設定してください。');
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE || DEFAULT_HANDLE;
  const result = await fetchLatestVideos(apiKey, handle);
  result.fetchedAt = new Date().toISOString();
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'latestVideos.json');
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`${result.videos.length} 件の公開動画を ${outputPath} に保存しました。`);
}

if (require.main === module) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { fetchLatestVideos };
