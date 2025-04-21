#!/usr/bin/env node
/**
 * splitVideos.js
 *
 * public/data/videos.json を読み込み、
 * 2021年10月以降の動画を年-月ごとに分割して
 * public/data/YYYY-MM.json に保存します。
 *
 * 使用方法:
 *   node scripts/splitVideos.js
 */

const fs = require('fs');
const path = require('path');

// 分割対象の開始日 (含む)
const cutoff = new Date('2021-10-01T00:00:00Z');

// 入力ファイル
const dataDir = path.join(__dirname, '..', 'public', 'data');
const inputPath = path.join(dataDir, 'videos.json');
if (!fs.existsSync(inputPath)) {
  console.error(`Error: ${inputPath} が見つかりません。先に fetchVideos.js を実行してください。`);
  process.exit(1);
}

// 出力ディレクトリ（存在しなければ作成）
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// JSON 読み込み
const allVideos = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// 2021年10月以降をフィルタ
const filtered = allVideos.filter(v => {
  const d = new Date(v.publishedAt);
  return d >= cutoff;
});

// 年-月ごとにグループ化
const groups = {};
filtered.forEach(v => {
  const d = new Date(v.publishedAt);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (!groups[key]) groups[key] = [];
  groups[key].push(v);
});

// 各グループを書き出し
Object.entries(groups).forEach(([ym, videos]) => {
  const outPath = path.join(dataDir, `${ym}.json`);
  fs.writeFileSync(outPath, JSON.stringify(videos, null, 2), 'utf-8');
  console.log(`Wrote ${videos.length} items to ${outPath}`);
});

console.log('Split complete.');