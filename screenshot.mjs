const { chromium } = require('playwright');
const dir = '/Users/aksharmadan/.gemini/antigravity/brain/cc79cde6-707a-4c05-81f4-d4925d4d7cbb';

const pages = [
  { url: 'http://localhost:3000',              file: 'ss_home.png' },
  { url: 'http://localhost:3000/analytics',    file: 'ss_analytics.png' },
  { url: 'http://localhost:3000/risk/churn',   file: 'ss_churn.png' },
  { url: 'http://localhost:3000/risk/renewal', file: 'ss_renewal.png' },
  { url: 'http://localhost:3000/copilot',      file: 'ss_copilot.png' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  for (const p of pages) {
    const page = await ctx.newPage();
    try {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: dir + '/' + p.file, fullPage: false });
      console.log('OK ' + p.file);
    } catch(e) { console.log('FAIL ' + p.file + ': ' + e.message.slice(0,80)); }
    await page.close();
  }
  await browser.close();
})();
