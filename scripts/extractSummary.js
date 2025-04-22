#!/usr/bin/env node
/**
 * extractSummary.js
 *
 * public/data/videos.json から各動画の title と description を抽出し、
 * public/data/videos-summary.json として保存します。
 *
 * Usage:
 *   node scripts/extractSummary.js
 */
const fs = require('fs');
const path = require('path');

// public/data/videos.json のパス
const dataDir = path.join(__dirname, '..', 'public', 'data');
const inputPath = path.join(dataDir, 'videos.json');
if (!fs.existsSync(inputPath)) {
  console.error(`Error: ${inputPath} が見つかりません。`);
  process.exit(1);
}

// JSON 読み込み
let videos;
try {
  videos = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (err) {
  console.error(`Error: JSON の読み込み/解析に失敗しました (${inputPath})`);
  console.error(err);
  process.exit(1);
}

// title と description の抽出
const summary = videos.map(v => ({
  title: v.title,
  description: v.description
}));

// 出力ファイルに書き込み
const outputPath = path.join(dataDir, 'videos-summary.json');
try {
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Created summary file: ${outputPath}`);
} catch (err) {
  console.error(`Error: ファイル書き込みに失敗しました (${outputPath})`);
  console.error(err);
  process.exit(1);
}