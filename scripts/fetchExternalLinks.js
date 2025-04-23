#!/usr/bin/env node
/**
 * fetchExternalLinks.js
 *
 * Reads URLs from public/data/allurls.txt, fetches each URL,
 * extracts the <title> tag if available, and writes an array of
 * { title, url, target, rel } objects to public/data/externalLinks.json.
 *
 * Usage:
 *   node scripts/fetchExternalLinks.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Fetches a URL, follows redirects up to 5 hops, and extracts the page title.
 * For non-HTML responses or errors, returns an empty title.
 * @param {string} urlStr
 * @param {number} redirects
 * @returns {Promise<{title: string, url: string}>}
 */
async function fetchUrl(urlStr, redirects = 0) {
  return new Promise((resolve) => {
    if (redirects > 5) {
      return resolve({ title: '', url: urlStr });
    }
    let urlObj;
    try {
      urlObj = new URL(urlStr);
    } catch (_) {
      return resolve({ title: '', url: urlStr });
    }
    const lib = urlObj.protocol === 'http:' ? http : https;
    const req = lib.get(urlObj, (res) => {
      const { statusCode, headers } = res;
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        const nextUrl = new URL(headers.location, urlObj).toString();
        return resolve(fetchUrl(nextUrl, redirects + 1));
      }
      if (statusCode !== 200) {
        res.resume();
        return resolve({ title: '', url: urlStr });
      }
      const contentType = headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        res.resume();
        return resolve({ title: '', url: urlStr });
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = match ? match[1].trim() : '';
        resolve({ title, url: urlStr });
      });
    });
    req.on('error', () => resolve({ title: '', url: urlStr }));
    req.setTimeout(10000, () => {
      req.abort();
      resolve({ title: '', url: urlStr });
    });
  });
}

(async () => {
  try {
    const inputPath = path.join(__dirname, '..', 'public', 'data', 'allurls.txt');
    const outputPath = path.join(__dirname, '..', 'public', 'data', 'externalLinks.json');
    const content = fs.readFileSync(inputPath, 'utf8');
    const urls = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results = [];
    for (const url of urls) {
      console.log(`Fetching ${url}...`);
      const { title } = await fetchUrl(url);
      results.push({
        title: title || url,
        url,
        target: '_blank',
        rel: 'noopener',
      });
    }
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Saved ${results.length} items to ${outputPath}`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();