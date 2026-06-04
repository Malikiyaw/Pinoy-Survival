// Download Babylon.js + GUI to vendor/ for offline use
const https = require('https');
const fs = require('fs');
const path = require('path');

const FILES = [
  ['https://cdn.babylonjs.com/babylon.js', 'vendor/babylon/babylon.js'],
  ['https://cdn.babylonjs.com/gui/babylon.gui.min.js', 'vendor/babylon/gui.min.js'],
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const doGet = (u) => new Promise((res, rej) => {
      https.get(u, r => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          doGet(r.headers.location).then(res, rej);
          return;
        }
        if (r.statusCode !== 200) { rej(new Error('HTTP ' + r.statusCode + ' for ' + u)); return; }
        const f = fs.createWriteStream(dest);
        let total = 0;
        r.on('data', c => { total += c.length; });
        r.pipe(f);
        f.on('finish', () => f.close(() => res(total)));
        f.on('error', rej);
        r.on('error', rej);
      }).on('error', rej);
    });
    doGet(url).then(resolve, reject);
  });
}

(async () => {
  for (const [url, dest] of FILES) {
    try {
      const bytes = await download(url, dest);
      const kb = (bytes / 1024).toFixed(1);
      console.log(`OK  ${dest}  (${kb} KB)`);
    } catch (e) {
      console.error(`FAIL ${dest}: ${e.message}`);
    }
  }
})();
