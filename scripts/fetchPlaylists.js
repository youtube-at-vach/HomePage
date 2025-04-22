#!/usr/bin/env node
/**
 * fetchPlaylists.js
 *
 * YouTube Data API を使用して、指定されたチャンネルのプレイリスト一覧と
 * 各プレイリストに含まれる動画IDを取得し、
 * public/data/playlists.json として保存します。
 * プレイリストに含まれる動画のうち、公開ステータスが "public" のものだけを取得します。
 *
 * 環境変数:
 *   YOUTUBE_API_KEY (APIキー)
 *
 * 使用方法:
 *   export YOUTUBE_API_KEY=YOUR_API_KEY
 *   node scripts/fetchPlaylists.js CHANNEL_ID
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  console.error('Error: 環境変数 YOUTUBE_API_KEY が設定されていません。');
  process.exit(1);
}

const channelId = process.argv[2];
if (!channelId) {
  console.error('Usage: node scripts/fetchPlaylists.js CHANNEL_ID');
  process.exit(1);
}

const youtube = google.youtube({ version: 'v3', auth: apiKey });

/**
 * チャンネルのすべてのプレイリストを取得
 * @param {string} channelId
 * @returns {Promise<Array<{id: string, title: string}>>}
 */
async function fetchAllPlaylists(channelId) {
  let playlists = [];
  let nextPageToken = null;
  do {
    const res = await youtube.playlists.list({
      part: 'snippet',
      channelId,
      maxResults: 50,
      pageToken: nextPageToken,
    });
    nextPageToken = res.data.nextPageToken;
    res.data.items.forEach(item => {
      playlists.push({
        id: item.id,
        title: item.snippet.title,
      });
    });
  } while (nextPageToken);
  return playlists;
}

/**
 * プレイリストの動画ID一覧を取得
 * @param {string} playlistId
 * @returns {Promise<Array<string>>}
 */
async function fetchPlaylistVideoIds(playlistId) {
  let videoIds = [];
  let nextPageToken = null;
  do {
    const res = await youtube.playlistItems.list({
      part: 'contentDetails',
      playlistId,
      maxResults: 50,
      pageToken: nextPageToken,
    });
    nextPageToken = res.data.nextPageToken;
    res.data.items.forEach(item => {
      if (item.contentDetails && item.contentDetails.videoId) {
        videoIds.push(item.contentDetails.videoId);
      }
    });
  } while (nextPageToken);
  // フィルタ: 公開ステータスが "public" の動画IDのみ返す
  const publicIds = [];
  // videos.list は一度に最大50件までなのでチャンク処理
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const res = await youtube.videos.list({
      part: 'status',
      id: chunk.join(','),
    });
    if (res.data.items && res.data.items.length) {
      res.data.items.forEach(item => {
        if (item.status && item.status.privacyStatus === 'public') {
          publicIds.push(item.id);
        }
      });
    }
  }
  return publicIds;
}

(async () => {
  try {
    console.log(`Fetching playlists for channel ${channelId}...`);
    const playlists = await fetchAllPlaylists(channelId);
    console.log(`Found ${playlists.length} playlists.`);

    const result = [];
    for (const pl of playlists) {
      console.log(`Fetching videos for playlist "${pl.title}" (${pl.id})...`);
      const ids = await fetchPlaylistVideoIds(pl.id);
      console.log(`  → ${ids.length} videos.`);
      result.push({ id: pl.id, title: pl.title, videoIds: ids });
    }

    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'playlists.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Saved ${result.length} playlists to ${outputPath}`);
  } catch (err) {
    console.error('Error fetching playlists:', err);
    process.exit(1);
  }
})();