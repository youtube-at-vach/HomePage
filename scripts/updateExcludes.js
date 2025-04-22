#!/usr/bin/env node
/**
 * updateExcludes.js
 *
 * public/data/videos.json と public/data/videos_mic.json を比較し、
 * videos_mic.json に含まれない動画IDを public/data/videoExcludes.json に設定します。
 *
 * Usage:
 *   node scripts/updateExcludes.js
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const allPath = path.join(dataDir, 'videos.json');
const micPath = path.join(dataDir, 'videos_mic.json');
const exclPath = path.join(dataDir, 'videoExcludes.json');

function exitWithError(msg) {
  console.error('Error:', msg);
  process.exit(1);
}

if (!fs.existsSync(allPath)) {
  exitWithError(`${allPath} が見つかりません。先に fetchVideos.js を実行してください。`);
}
if (!fs.existsSync(micPath)) {
  exitWithError(`${micPath} が見つかりません。必要な動画IDが入った videos_mic.json を配置してください。`);
}

// 読み込み
let allVideos;
let micRaw;
try {
  allVideos = JSON.parse(fs.readFileSync(allPath, 'utf8'));
} catch (err) {
  exitWithError(`${allPath} の解析に失敗しました: ${err.message}`);
}
try {
  micRaw = JSON.parse(fs.readFileSync(micPath, 'utf8'));
} catch (err) {
  exitWithError(`${micPath} の解析に失敗しました: ${err.message}`);
}

// micRaw からIDリスト抽出
const micIDs = Array.isArray(micRaw)
  ? micRaw.map(item => typeof item === 'string' ? item : item.id).filter(Boolean)
  : exitWithError(`${micPath} は配列である必要があります。`);

// allVideos からIDリスト
const allIDs = allVideos.map(v => v.id);

// 除外リスト = allIDs - micIDs
const excludes = allIDs.filter(id => micIDs.indexOf(id) < 0);

// 書き出し
try {
  fs.writeFileSync(exclPath, JSON.stringify(excludes, null, 2), 'utf8');
  console.log(`Generated excludes list: ${excludes.length} IDs written to ${exclPath}`);
} catch (err) {
  exitWithError(`ファイル書き込みに失敗しました: ${err.message}`);
}