#!/usr/bin/env node
/**
 * editVideos.js
 *
 * public/data/videos.json をインタラクティブにフィルタし、
 * 必要な動画のみを残して更新します。
 *
 * Usage:
 *   node scripts/editVideos.js
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function main() {
  const dataPath = path.join(__dirname, '..', 'public', 'data', 'videos.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Error: ${dataPath} が見つかりません。`);
    process.exit(1);
  }
  const raw = fs.readFileSync(dataPath, 'utf-8');
  let videos;
  try {
    videos = JSON.parse(raw);
  } catch (e) {
    console.error(`Error: JSONの解析に失敗しました (${dataPath})`);
    process.exit(1);
  }
  console.log(`Loaded ${videos.length} videos from ${dataPath}`);
  // バックアップ
  const backupPath = dataPath + '.bak';
  fs.writeFileSync(backupPath, raw, 'utf-8');
  console.log(`Backup created: ${backupPath}`);
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q) => new Promise(resolve => rl.question(q, resolve));
  
  const kept = [];
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const date = v.publishedAt ? v.publishedAt.slice(0, 10) : '';
    const info = `[${i + 1}/${videos.length}] ${date} - ${v.title}`;
    const ans = await question(`Keep? (Y/n) ${info} `);
    if (ans.trim().toLowerCase().startsWith('n')) {
      console.log('  Dropped');
    } else {
      kept.push(v);
      console.log('  Kept');
    }
  }
  console.log(`\n${kept.length} videos kept, ${videos.length - kept.length} dropped.`);
  // Exclude list: IDs of videos dropped
  const allIDs = videos.map(v => v.id);
  const keptIDs = new Set(kept.map(v => v.id));
  const excludeIDs = allIDs.filter(id => !keptIDs.has(id));
  const exclPath = path.join(path.dirname(dataPath), 'videoExcludes.json');
  fs.writeFileSync(exclPath, JSON.stringify(excludeIDs, null, 2), 'utf-8');
  console.log(`Excluded IDs written to ${exclPath}`);
  rl.close();
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});