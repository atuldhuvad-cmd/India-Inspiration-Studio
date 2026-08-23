/**
 * verify_message_generation.js
 * Confirms Daily Poster loads dataset messages onto editor + canvas.
 * Uses installed Edge via Playwright executablePath.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

function detectEdge() {
  for (const p of EDGE_PATHS) if (fs.existsSync(p)) return p;
  throw new Error('Installed Edge not found');
}

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = path.join(ROOT, urlPath.replace(/\//g, path.sep));
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, url: 'http://127.0.0.1:' + server.address().port + '/index.html' });
    });
  });
}

(async () => {
  const EDGE = detectEdge();
  const { server, url } = await startServer();
  console.log('Serving', url);
  const browser = await chromium.launch({ headless: false, executablePath: EDGE, args: ['--no-first-run'] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await ctx.newPage();
  const errs = [];
  const skip = [/ServiceWorker/i, /null.*origin/i, /Failed to load resource/i];
  page.on('pageerror', e => { if (!skip.some(r => r.test(e.message))) { errs.push(e.message); console.log('PAGE ERR', e.message); } });
  page.on('console', m => {
    if (m.type() === 'error' && !skip.some(r => r.test(m.text()))) { errs.push(m.text()); console.log('CONSOLE ERR', m.text()); }
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2200);

  async function snapshot(label) {
    const info = await page.evaluate(() => {
      const c = document.getElementById('poster');
      const msg = (document.getElementById('messageEn') || {}).value || '';
      const current = (typeof currentEnglishMessage === 'function') ? currentEnglishMessage() : '';
      const cx = c.getContext('2d');
      const mid = cx.getImageData(540, 960, 1, 1).data;
      const quoteZone = cx.getImageData(540, 1100, 1, 1).data;
      return {
        date: document.getElementById('date').value,
        occasion: document.getElementById('occasionEn').value,
        style: document.getElementById('style').value,
        status: (document.getElementById('status') || {}).textContent,
        w: c.width, h: c.height,
        msg, current,
        recMsg: rec && rec.Message_English,
        custom: (typeof currentCustom === 'function') ? currentCustom() : null,
        mid: [mid[0], mid[1], mid[2]],
        metrics: window.__posterQuoteMetrics || null
      };
    });
    const issues = [];
    if (!info.msg || !String(info.msg).trim()) issues.push('blank textarea');
    if (!info.current || !String(info.current).trim()) issues.push('blank currentEnglishMessage');
    if (info.w !== 1080 || info.h !== 1920) issues.push('canvas ' + info.w + 'x' + info.h);
    if (info.status && info.status.indexOf('Render Error') !== -1) issues.push('status error');
    console.log('\n--- ' + label + ' ---');
    console.log(JSON.stringify({ date: info.date, occasion: info.occasion, style: info.style, status: info.status, msg: info.msg, current: info.current, w: info.w, h: info.h, metrics: info.metrics }, null, 2));
    if (issues.length) console.log('FAIL', issues.join('; '));
    else console.log('PASS');
    const png = await page.evaluate(() => document.getElementById('poster').toDataURL('image/png'));
    fs.writeFileSync(path.join(SHOTS, 'msg_' + label + '_native.png'), Buffer.from(png.split(',')[1], 'base64'));
    return { label, issues, info };
  }

  async function loadDate(iso) {
    await page.evaluate(d => { if (typeof load === 'function') load(d); }, iso);
    await page.waitForTimeout(1200);
  }
  async function setStyle(style) {
    await page.evaluate(st => {
      const sel = document.getElementById('style');
      if (sel) sel.value = st;
      document.querySelectorAll('#posterQuickChips .chip').forEach(c => {
        c.classList.toggle('active', c.dataset.style === st);
      });
      if (typeof render === 'function') render();
    }, style);
    await page.waitForTimeout(900);
  }

  const results = [];
  await loadDate('2026-08-19');
  results.push(await snapshot('kindness_auto'));
  await setStyle('Hero Focus');
  results.push(await snapshot('kindness_human'));
  await setStyle('Sacred Arch');
  results.push(await snapshot('kindness_arch'));
  await setStyle('Neon');
  results.push(await snapshot('kindness_neon'));

  const preserved = await page.evaluate(() => document.getElementById('messageEn').value);
  await setStyle('Auto Theme');
  const afterAuto = await page.evaluate(() => document.getElementById('messageEn').value);
  results.push({ label: 'composition_preserve', issues: preserved === afterAuto && preserved.trim() ? [] : ['message changed on Auto switch'], info: { preserved, afterAuto } });
  console.log('\n--- composition_preserve ---', preserved === afterAuto ? 'PASS' : 'FAIL');

  await page.evaluate(() => {
    document.getElementById('messageEn').value = 'Custom saved line for this date.';
    if (typeof saveCustomMessages === 'function') saveCustomMessages();
    if (typeof render === 'function') render();
  });
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => document.getElementById('messageEn').value);
  await page.evaluate(() => { if (typeof restoreOriginal === 'function') restoreOriginal(); });
  await page.waitForTimeout(400);
  const restored = await page.evaluate(() => document.getElementById('messageEn').value);
  await page.evaluate(() => {
    document.getElementById('messageEn').value = 'Temporary reset check.';
    if (typeof resetEnglish === 'function') resetEnglish();
  });
  await page.waitForTimeout(400);
  const reset = await page.evaluate(() => document.getElementById('messageEn').value);
  const saveIssues = [];
  if (saved.indexOf('Custom saved line') === -1) saveIssues.push('save failed');
  if (!restored.trim() || restored.indexOf('Custom saved line') !== -1) saveIssues.push('restore failed: ' + restored);
  if (!reset.trim() || reset === 'Temporary reset check.') saveIssues.push('reset failed: ' + reset);
  results.push({ label: 'save_restore_reset', issues: saveIssues, info: { saved, restored, reset } });
  console.log('\n--- save_restore_reset ---', saveIssues.length ? 'FAIL ' + saveIssues.join('; ') : 'PASS');
  console.log({ saved, restored, reset });

  await page.evaluate(() => { document.getElementById('signature').value = ''; if (typeof render === 'function') render(); });
  await page.waitForTimeout(500);
  results.push(await snapshot('kindness_blank_sig'));

  await loadDate('2026-08-23');
  await setStyle('Auto Theme');
  results.push(await snapshot('patience_auto'));

  const pngCheck = await page.evaluate(() => document.getElementById('poster').toDataURL('image/png'));
  const exportOk = pngCheck.indexOf('data:image/png') === 0;
  results.push({ label: 'export_png', issues: exportOk ? [] : ['no png'], info: { bytes: pngCheck.length } });

  console.log('\n=== SUMMARY ===');
  let all = true;
  for (const r of results) {
    if (r.issues && r.issues.length) all = false;
    console.log((!r.issues || !r.issues.length ? 'PASS' : 'FAIL') + '  ' + r.label + (r.issues && r.issues.length ? '  ' + r.issues.join('; ') : ''));
  }
  console.log('JS errors', errs.length, errs);
  if (errs.length) all = false;
  await page.waitForTimeout(800);
  await browser.close();
  server.close();
  process.exit(all ? 0 : 1);
})().catch(err => { console.error(err); process.exit(1); });
