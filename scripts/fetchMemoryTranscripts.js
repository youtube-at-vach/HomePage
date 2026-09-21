#!/usr/bin/env node
// Bounded, resumable caption collection. No API key, audio download or automatic retries.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { parseArgs } = require('node:util');
const { parseSubtitles } = require('./importJevSubtitles');

const ROOT = path.resolve(__dirname, '..');
const ID = /^[\w-]{11}$/;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function atomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
  await fs.rename(tmp, file);
}
function run(bin, args, timeout = 40000) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.stdout.on('data', b => { stdout += b; if (stdout.length > 8_000_000) child.kill('SIGKILL'); });
    child.stderr.on('data', b => { stderr += b; if (stderr.length > 100_000) child.kill('SIGKILL'); });
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout }); });
  });
}
function normalize(rows) {
  if (!Array.isArray(rows) || rows.length > 100000) throw new Error('字幕区間数が不正です');
  const clean = rows.map(r => ({ start: Number(r.start), end: Number(r.start) + Number(r.duration ?? (r.end - r.start)), text: String(r.text || '').trim() }))
    .filter(r => r.text && Number.isFinite(r.start) && Number.isFinite(r.end) && r.start >= 0 && r.end > r.start);
  if (!clean.length || clean.some((r, i) => i && r.start < clean[i - 1].start)) throw new Error('字幕の時刻が不正です');
  return clean;
}
async function collectOne(id, options) {
  const script = 'import json,sys\nfrom youtube_transcript_api import YouTubeTranscriptApi\ntry:\n t=YouTubeTranscriptApi().fetch(sys.argv[1],languages=["ja","en"])\n print(json.dumps({"rows":t.to_raw_data(),"language":t.language_code,"generated":t.is_generated},ensure_ascii=False))\nexcept Exception as e:\n print(json.dumps({"error":type(e).__name__}))';
  const primary = await run(options.python, ['-c', script, id]);
  if (primary.code === 0) {
    const data = JSON.parse(primary.stdout);
    if (data.rows) return { rows: normalize(data.rows), method: 'youtube-transcript-api', language: data.language, generated: data.generated };
    if (/Blocked|TooManyRequests|RateLimit/i.test(data.error || '')) throw new Error('caption-access-blocked');
  }
  // A second method is attempted once for ordinary failures; stop probing on access blocks.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-subs-'));
  try {
    const fallback = await run(options.ytdlp, [
      '--no-config', '--no-playlist', '--skip-download', '--write-subs', '--write-auto-subs',
      '--sub-langs', 'ja.*,en.*', '--sub-format', 'vtt', '--retries', '0', '--fragment-retries', '0',
      '--extractor-retries', '0', '--socket-timeout', '10', '--no-warnings',
      '-o', path.join(dir, `${id}.%(ext)s`), `https://www.youtube.com/watch?v=${id}`
    ], 45000);
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.vtt')).sort((a, b) =>
      (a.includes('.ja.') ? -1 : 1) - (b.includes('.ja.') ? -1 : 1));
    if (fallback.code || !files.length) return null;
    const file = files[0];
    const rows = parseSubtitles(await fs.readFile(path.join(dir, file), 'utf8'));
    return { rows: normalize(rows), method: 'yt-dlp', language: file.includes('.ja.') ? 'ja' : 'en', generated: null };
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}
async function collect(ids, options, fetchOne = collectOne) {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !ID.test(id))) throw new Error('動画IDが不正です');
  const unique = [...new Set(ids)];
  if (unique.length > 500) throw new Error('一度に扱える動画IDは500件までです');
  const manifestFile = path.join(options.output, 'manifest.json');
  let manifest = {};
  try { manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let attempted = 0, saved = 0;
  let consecutiveFailures = 0;
  for (const id of unique) {
    if (attempted >= options.limit) break;
    if (manifest[id] && !(options.retryMissing && manifest[id].status === 'unavailable')) continue;
    // An interrupted request counts as attempted. Never silently hammer one ID on resume.
    manifest[id] = { status: 'attempted', checkedAt: new Date().toISOString() };
    await atomic(manifestFile, manifest);
    attempted++;
    try {
      const result = await fetchOne(id, options);
      if (result) {
        await atomic(path.join(options.output, `${id}.json`), result.rows);
        manifest[id] = { status: 'available', method: result.method, language: result.language,
          generated: result.generated, segments: result.rows.length, checkedAt: new Date().toISOString() };
        saved++;
        consecutiveFailures = 0;
      } else manifest[id] = { status: 'unavailable', checkedAt: new Date().toISOString() };
    } catch {
      manifest[id] = { status: 'error', checkedAt: new Date().toISOString() };
    }
    if (manifest[id].status !== 'available') consecutiveFailures++;
    await atomic(manifestFile, manifest);
    console.log(`${attempted}/${options.limit} ${id}: ${manifest[id].status}`);
    if (consecutiveFailures >= 5) {
      console.log('5件連続で字幕を取得できなかったため停止しました。アクセス制限または字幕なしが続いています。');
      break;
    }
    if (attempted < options.limit) await sleep(options.delay);
  }
  return { attempted, saved, available: Object.values(manifest).filter(x => x.status === 'available').length };
}
async function main() {
  const { values: a } = parseArgs({ options: { input: { type: 'string', default: path.join(ROOT, 'public/data/videos.json.bak') },
    output: { type: 'string', default: path.join(ROOT, '.local/jev-transcripts') },
    limit: { type: 'string', default: '10' }, delay: { type: 'string', default: '1500' },
    'retry-missing': { type: 'boolean', default: false }, python: { type: 'string', default: path.join(ROOT, '.local/venv/bin/python') },
    ytdlp: { type: 'string', default: path.join(ROOT, '.local/venv/bin/yt-dlp') } } });
  const limit = Number(a.limit), delay = Number(a.delay);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(delay) || delay < 500 || delay > 30000) throw new Error('--limit は1〜100、--delay は500〜30000 ms');
  const data = JSON.parse(await fs.readFile(a.input, 'utf8'));
  const ids = (Array.isArray(data) ? data : data.videos).map(x => typeof x === 'string' ? x : x.id);
  console.log(await collect(ids, { output: path.resolve(a.output), limit, delay, retryMissing: a['retry-missing'], python: a.python, ytdlp: a.ytdlp }));
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { collect, collectOne, normalize };
