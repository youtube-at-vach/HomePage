#!/usr/bin/env node
// Optional current title, description, date and public status refresh via YouTube Data API.
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
async function enrich(catalog, apiKey, fetcher = fetch) {
  if (!Array.isArray(catalog.videos) || catalog.videos.length > 500 || catalog.videos.some(v => !/^[\w-]{11}$/.test(v.id))) throw new Error('カタログは500本以下の有効な動画IDが必要です');
  const request = async (endpoint, params) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('key', apiKey);
    let res;
    try { res = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000) }); }
    catch { throw new Error(`YouTube ${endpoint} 通信失敗。再試行はしません。`); }
    if (!res.ok) throw new Error(`YouTube ${endpoint} HTTP ${res.status}`);
    return res.json();
  };
  const channel = await request('channels', { part: 'id', forHandle: 'va-ch', maxResults: '1' });
  const channelId = channel.items?.[0]?.id;
  if (!channelId) throw new Error('対象チャンネルを確認できません');
  const details = new Map();
  for (let i = 0; i < catalog.videos.length; i += 50) {
    const response = await request('videos', { part: 'snippet,status', id: catalog.videos.slice(i, i + 50).map(v => v.id).join(',') });
    for (const item of response.items || []) if (item.snippet?.channelId === channelId && item.status?.privacyStatus === 'public') details.set(item.id, item);
  }
  if (!details.size) throw new Error('公開動画が確認できず、旧データを維持します');
  return { generatedAt: new Date().toISOString(), videos: catalog.videos.filter(v => details.has(v.id)).map(v => {
    const item = details.get(v.id), s = item.snippet;
    return { ...v, title: s.title, description: s.description || '', publishedAt: s.publishedAt,
      thumbnail: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
      metadataSource: 'youtube-data-api' };
  }) };
}
async function main() {
  const { values: a } = parseArgs({ options: { input: { type: 'string', default: path.join(ROOT, '.local/memory-catalog.json') },
    output: { type: 'string', default: path.join(ROOT, '.local/memory-catalog.json') } } });
  if (!process.env.YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY が必要です');
  const result = await enrich(JSON.parse(await fs.readFile(a.input)), process.env.YOUTUBE_API_KEY);
  const tmp = `${a.output}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(result, null, 2) + '\n'); await fs.rename(tmp, a.output);
  console.log(`${result.videos.length}本の公開動画情報を更新しました。`);
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { enrich };
