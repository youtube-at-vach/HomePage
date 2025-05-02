#!/usr/bin/env node
/**
 * generateIndex.js
 *
 * public/articles フォルダ内の Markdown ファイルから
 * タイトルなどのメタデータを抽出し、
 * public/data/index.json として保存します。
 *
 * Usage:
 *   node scripts/generateIndex.js
 */
const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '..', 'public', 'articles');
const dataDir = path.join(__dirname, '..', 'public', 'data');
const outputPath = path.join(dataDir, 'index.json');

function exitWithError(msg) {
  console.error('Error:', msg);
  process.exit(1);
}

if (!fs.existsSync(articlesDir)) {
  exitWithError(`${articlesDir} が見つかりません。`);
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Markdown ファイルを取得し、タイトルを抽出
const files = fs.readdirSync(articlesDir)
  .filter(file => file.endsWith('.md'))
  .sort()
  .reverse();

const list = files.map(file => {
  const fullPath = path.join(articlesDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const firstLine = content.split(/\r?\n/)[0] || '';
  const title = firstLine.replace(/^#\s*/, '').trim();
  return { file, title, url: `articles/${file}` };
});

// JSON に書き出し
fs.writeFileSync(outputPath, JSON.stringify(list, null, 2), 'utf8');
console.log(`記事インデックスを ${outputPath} に生成しました。項目数: ${list.length}`);