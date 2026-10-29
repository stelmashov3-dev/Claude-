// PAGE='episode.html?ep=1&fmt=h' node render.cjs <framesDir> <workers> [fps]  -> frames/f00000.jpg ...
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, nw = '4', fpsArg = '30'] = process.argv.slice(2); const N = +nw, fps = +fpsArg;
  fs.mkdirSync(out, { recursive: true });
  const browsers = [];
  let done = 0; const t0 = Date.now();
  await Promise.all([...Array(N).keys()].map(async (k) => {
    const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); browsers.push(b);
    const page = process.env.PAGE || 'index.html', vert = page.includes('fmt=v');
    const p = await b.newPage({ viewport: vert ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto('http://localhost:8765/' + page); await p.waitForFunction(() => !!window.ready, null, { timeout: 60000 }); await p.evaluate(() => window.ready);
    const total = Math.round(await p.evaluate(() => window.DURATION) * fps);
    for (let i = k; i < total; i += N) {
      const f = `${out}/f${String(i).padStart(5, '0')}.jpg`;
      if (fs.existsSync(f)) continue;
      await p.evaluate(t => window.renderAt(t), i / fps);
      await p.screenshot({ path: f, quality: 93 });
      if (++done % 100 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
    }
  }));
  await Promise.all(browsers.map(b => b.close())); console.log('DONE');
})();
