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
const { execSync } = require('child_process');

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
  const fullMdPath = path.join(articlesDir, file);
  // Generate HTML from Markdown using Marp
  const baseName = file.replace(/\.md$/, '');
  const htmlFile = baseName + '.html';
  const fullHtmlPath = path.join(articlesDir, htmlFile);
  try {
    execSync(`marp "${fullMdPath}" -o "${fullHtmlPath}"`, { stdio: 'inherit' });
  } catch (err) {
    exitWithError(`Marp conversion failed for ${file}: ${err.message}`);
  }
  // Extract title from Markdown (skip YAML front-matter, find first heading)
  const content = fs.readFileSync(fullMdPath, 'utf8');
  const lines = content.split(/\r?\n/);
  let title = '';
  let inFrontMatter = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Detect start of YAML front-matter
    if (i === 0 && line === '---') {
      inFrontMatter = true;
      continue;
    }
    // Skip lines in front-matter until closing '---'
    if (inFrontMatter) {
      if (line === '---') {
        inFrontMatter = false;
      }
      continue;
    }
    // Use first Markdown heading as title
    if (line.startsWith('#')) {
      title = line.replace(/^#+\s*/, '').trim();
      break;
    }
  }
  // Fallback: use file base name if no title found
  if (!title) {
    console.warn(`No title found in ${file}, using file name.`);
    title = baseName;
  }
  return { file: htmlFile, title, url: `articles/${htmlFile}` };
});

// JSON に書き出し
fs.writeFileSync(outputPath, JSON.stringify(list, null, 2), 'utf8');
console.log(`記事インデックスを ${outputPath} に生成しました。項目数: ${list.length}`);