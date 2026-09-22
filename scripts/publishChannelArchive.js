#!/usr/bin/env node
// Weekly publication: reuse validated Jev results; make no paid Jev/caption calls.
const fs = require('node:fs/promises');
const path = require('node:path');
const { buildCollections } = require('./memoryCollections');
const ROOT = path.resolve(__dirname, '..');
const thumbnailUrl = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

function publish(catalog, previous) {
  if (!Array.isArray(catalog.videos) || !catalog.videos.length || !Array.isArray(catalog.playlists)) throw new Error('公式APIの収集結果が不正です');
  const prior = new Map((previous.videos || []).map(v => [v.id, v]));
  const collections = buildCollections(catalog);
  const memberships = new Map();
  for (const group of collections) for (const id of group.videoIds) {
    if (!memberships.has(id)) memberships.set(id, []);
    memberships.get(id).push(group.id);
  }
  const videos = catalog.videos.map(v => {
    const old = prior.get(v.id);
    // Jev's request includes date, title and description. Any change invalidates
    // the whole classification; transcript text and its timestamps remain searchable.
    const same = old && old.title === v.title && old.description === v.description && old.publishedAt === v.publishedAt;
    return { id: v.id, title: v.title, publishedAt: v.publishedAt, metadataSource: 'youtube-data-api',
      description: v.description, transcript: !!old?.transcript, captionStatus: old?.captionStatus || null,
      analyzed: !!(same && old.analyzed), searchText: old?.searchText || '', searchOffsets: old?.searchOffsets || '',
      projects: same ? old.projects || [] : [], evidence: same ? old.evidence || [] : [], collections: memberships.get(v.id) || [],
      thumbnail: v.thumbnail || old?.thumbnail || thumbnailUrl(v.id) };
  });
  const generatedAt = new Date().toISOString();
  const memory = { version: 2, channelId: catalog.channelId, generatedAt, projects: previous.projects || {}, collections, videos,
    coverage: { catalog: videos.length, dated: videos.filter(v => v.publishedAt).length,
      transcripts: videos.filter(v => v.transcript).length, analyzed: videos.filter(v => v.analyzed).length,
      captionAttempted: videos.filter(v => v.captionStatus).length,
      captionUnavailable: videos.filter(v => ['unavailable', 'error', 'attempted'].includes(v.captionStatus)).length } };
  const latest = { channelId: catalog.channelId, channelUrl: 'https://www.youtube.com/@va-ch', fetchedAt: generatedAt,
    videos: [...catalog.videos].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 12).map(v => ({
      id: v.id, title: v.title, description: v.description, publishedAt: v.publishedAt,
      thumbnail: v.thumbnail || thumbnailUrl(v.id), url: v.url })) };
  return { memory, latest };
}
async function main() {
  const catalog = JSON.parse(await fs.readFile(path.join(ROOT, '.local/memory-catalog.json')));
  const memoryPath = path.join(ROOT, 'public/data/projectMemory.json');
  const latestPath = path.join(ROOT, 'public/data/latestVideos.json');
  const previous = JSON.parse(await fs.readFile(memoryPath));
  const { memory, latest } = publish(catalog, previous);
  for (const [target, value] of [[memoryPath, memory], [latestPath, latest]]) {
    const temp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n');
    await fs.rename(temp, target);
  }
  console.log(`${memory.coverage.catalog}本、プレイリスト${memory.collections.filter(g => g.kind === 'playlist').length}件、新着${latest.videos.length}本を公開用に更新しました。Jev呼び出しなし。`);
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { publish };
