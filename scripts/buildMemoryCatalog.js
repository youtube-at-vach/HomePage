#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
function buildCatalog(flat, historical) {
  if (!Array.isArray(flat.entries) || flat.entries.length > 5000 || !Array.isArray(historical)) throw new Error('動画一覧が不正です');
  const known = new Map(historical.filter(v => /^[\w-]{11}$/.test(v.id) && v.publishedAt).map(v => [v.id, v]));
  const seen = new Set();
  return flat.entries.filter(v => /^[\w-]{11}$/.test(v.id) && !seen.has(v.id) && seen.add(v.id)).map(v => {
    const old = known.get(v.id);
    return { id: v.id, title: v.title || old?.title || v.id, description: old?.description || '',
      publishedAt: old?.publishedAt || null, metadataSource: old ? 'historical-backup' : 'public-playlist',
      url: `https://www.youtube.com/watch?v=${v.id}` };
  });
}
async function main() {
  const { values: a } = parseArgs({ options: {
    flat: { type: 'string', default: path.join(ROOT, '.local/channel-flat.json') },
    historical: { type: 'string', default: path.join(ROOT, 'public/data/videos.json.bak') },
    output: { type: 'string', default: path.join(ROOT, '.local/memory-catalog.json') }
  } });
  const videos = buildCatalog(JSON.parse(await fs.readFile(a.flat)), JSON.parse(await fs.readFile(a.historical)));
  await fs.writeFile(a.output, JSON.stringify({ generatedAt: new Date().toISOString(), videos }, null, 2) + '\n');
  console.log(`${videos.length}件、日付あり ${videos.filter(v => v.publishedAt).length}件 -> ${a.output}`);
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { buildCatalog };
