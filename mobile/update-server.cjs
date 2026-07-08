// 本地 expo-updates 服务（v2 manifest 格式）
// 新 APK 构建后会包含 runtimeVersion: "1.0.0"，与 server 的 v2 manifest 匹配。
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIST = path.join(__dirname, 'dist');
const PORT = 8080;
const BASE = 'http://localhost:8080';

function buildManifest() {
  const meta = JSON.parse(fs.readFileSync(path.join(DIST, 'metadata.json'), 'utf8'));
  const fm = meta.fileMetadata.android;

  // v2 格式 assets
  const assets = (fm.assets || []).map((a) => {
    const p = a.path.replace(/\\/g, '/');
    const hash = p.split('/').pop();
    return {
      hash,
      key: p,
      url: `${BASE}/${p}`,
      contentType: a.ext === 'png' ? 'image/png' : (a.ext === 'jpg' ? 'image/jpeg' : `image/${a.ext}`),
      fileExtension: `.${a.ext}`,
    };
  });

  const manifestId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  return {
    id: manifestId,
    createdAt,
    runtimeVersion: '1.0.0',
    launchAsset: {
      hash: fm.bundle.split('/').pop(),
      key: 'bundle',
      contentType: 'application/javascript',
      url: `${BASE}/${fm.bundle}`,
    },
    assets,
    metadata: {},
    extra: {},
  };
}

const MIME = {
  '.json': 'application/json',
  '.hbc': 'application/javascript',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/api/manifest') {
    const manifest = buildManifest();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('expo-protocol-version', '1');
    res.setHeader('expo-manifest', '1');
    res.end(JSON.stringify(manifest));
    console.log('[server] v2 manifest ->', manifest.launchAsset.url);
    return;
  }
  let rel = urlPath.replace(/^\//, '');
  const fp = path.join(DIST, rel);
  if (!fp.startsWith(DIST)) { res.statusCode = 400; res.end(); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; res.end('not found: ' + rel); return; }
    const ext = path.extname(fp) || '';
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[server] v2 update server listening on', PORT, 'serving', DIST);
});
