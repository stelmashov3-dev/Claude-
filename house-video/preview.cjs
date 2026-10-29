// PAGE='episode.html?ep=1&fmt=v' node preview.cjs out_dir t1 t2 ...  -> JPEG stills
const { chromium } = require('playwright');
(async () => {
  const [out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = process.env.PAGE || 'index.html', vert = page.includes('fmt=v');
  const p = await b.newPage({ viewport: vert ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
  p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/' + page); await p.waitForFunction(() => !!window.ready, null, { timeout: 60000 }); await p.evaluate(() => window.ready);
  for (const t of ts) { const s = Date.now(); await p.evaluate(t => window.renderAt(t), +t); await p.screenshot({ path: `${out}/t${String(t).padStart(5, '0')}.jpg`, quality: 85 }); console.log(t, Date.now() - s, 'ms'); }
  await b.close();
})();
