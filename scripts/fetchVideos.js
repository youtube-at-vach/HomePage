#!/usr/bin/env node
/**
 * fetchVideos.js
 *
 * YouTube Data APIを使用して、指定されたチャンネルの動画基本データを取得し、
 * public/data/videos.json として保存します。
 *
 * 必要環境変数:
 *   YOUTUBE_API_KEY (APIキー)
 *
 * 使用方法:
 *   # APIキーを環境変数にセット
 *   export YOUTUBE_API_KEY=YOUR_API_KEY
 *   # スクリプト実行 (チャンネルIDはYouTubeのチャンネルURLから取得)
 *   node scripts/fetchVideos.js UCxxxxxxxxxxxxxxxx
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
  console.error('Usage: node scripts/fetchVideos.js CHANNEL_ID');
  process.exit(1);
}

const youtube = google.youtube({
  version: 'v3',
  auth: apiKey,
});

/**
 * チャンネルの動画をすべて取得
 */
async function fetchAllVideos(channelId) {
  let videos = [];
  let nextPageToken = null;
  do {
    const searchRes = await youtube.search.list({
      part: 'id',
      channelId,
      maxResults: 50,
      pageToken: nextPageToken,
      type: 'video',
      order: 'date',
    });
    nextPageToken = searchRes.data.nextPageToken;
    const ids = searchRes.data.items.map(item => item.id.videoId).join(',');
    if (!ids) break;
    const videoRes = await youtube.videos.list({
      part: 'snippet',
      id: ids,
    });
    videoRes.data.items.forEach(item => {
      videos.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails,
        url: `https://www.youtube.com/watch?v=${item.id}`
      });
    });
  } while (nextPageToken);
  return videos;
}

/**
 * メイン処理
 */
(async () => {
  try {
    const videos = await fetchAllVideos(channelId);
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'videos.json');
    fs.writeFileSync(outputPath, JSON.stringify(videos, null, 2), 'utf-8');
    console.log(`Fetched ${videos.length} videos. Saved to ${outputPath}`);
  } catch (err) {
    console.error('Error fetching videos:', err);
    process.exit(1);
  }
})();