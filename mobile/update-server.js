const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8080;
const HOST = '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');
// 持久化 bundle hash → createdAt 映射，避免每次请求都生成新时间戳导致重复下载
const CREATED_AT_CACHE_PATH = path.join(__dirname, 'update-cache.json');

function loadCreatedAtCache() {
  try {
    return JSON.parse(fs.readFileSync(CREATED_AT_CACHE_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveCreatedAtCache(cache) {
  try {
    fs.writeFileSync(CREATED_AT_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('Failed to save createdAt cache:', e.message);
  }
}

// 根据 bundle hash 获取或创建稳定的 createdAt
// hash 不变 → 返回相同的 createdAt（避免重复下载）
// hash 变化 → 生成新的 createdAt 并持久化（确保新更新被识别）
function getOrCreateCreatedAt(bundleHashHex) {
  const cache = loadCreatedAtCache();
  if (cache[bundleHashHex]) {
    return cache[bundleHashHex];
  }
  const newCreatedAt = new Date().toISOString();
  cache[bundleHashHex] = newCreatedAt;
  saveCreatedAtCache(cache);
  return newCreatedAt;
}

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, expo-channel, expo-runtime-version, expo-platform, expo-accept-signature, expo-protocol-version');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/manifest' || req.url.startsWith('/api/manifest?')) {
    serveManifest(req, res);
    return;
  }

  let filePath = path.join(DIST_DIR, req.url);
  if (req.url === '/' || req.url === '') {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // 根据URL路径推断Content-Type
    let contentType = 'application/octet-stream';
    if (req.url.startsWith('/assets/')) {
      contentType = 'image/png';
    } else if (req.url.includes('/_expo/static/js/')) {
      contentType = 'application/javascript';
    } else if (req.url.endsWith('.json')) {
      contentType = 'application/json';
    } else if (req.url.endsWith('.html')) {
      contentType = 'text/html';
    }

    // 读取完整文件并发送，设置Content-Length
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': data.length,
      });
      res.end(data);
    });
  });
});

// 返回 Base64URL 编码的 SHA-256（无填充），expo-updates 要求的格式
function computeSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('base64url')));
    stream.on('error', reject);
  });
}

// 返回十六进制 SHA-256，用于生成稳定 UUID
function computeSHA256Hex(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function serveManifest(req, res) {
  const runtimeVersion = req.headers['expo-runtime-version'] || '1.0.0';
  const platform = req.headers['expo-platform'] || 'android';
  const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
  const port = PORT;

  const metadataPath = path.join(DIST_DIR, 'metadata.json');

  try {
    const data = await fs.promises.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(data);
    const platformData = metadata.fileMetadata && metadata.fileMetadata[platform];

    if (!platformData) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `No update for platform: ${platform}` }));
      return;
    }

    // 计算每个资源文件的SHA-256哈希
    const assets = [];
    for (let index = 0; index < (platformData.assets || []).length; index++) {
      const asset = platformData.assets[index];
      const assetPath = path.join(DIST_DIR, asset.path);
      const sha256 = await computeSHA256(assetPath);
      assets.push({
        hash: sha256,
        key: `asset-${index}`,
        contentType: `image/${asset.ext || 'png'}`,
        fileExtension: asset.ext || 'png',
        url: `http://${host}:${port}/${asset.path.replace(/\\/g, '/')}`,
      });
    }

    // 计算bundle的SHA-256哈希（base64url 用于 hash 字段）
    const bundlePath = path.join(DIST_DIR, platformData.bundle);
    const bundleSHA256 = await computeSHA256(bundlePath);
    const launchAsset = {
      hash: bundleSHA256,
      key: 'bundle',
      contentType: 'application/javascript',
      fileExtension: '.hbc',
      url: `http://${host}:${port}/${platformData.bundle.replace(/\\/g, '/')}`,
    };

    // 基于bundle的SHA-256(十六进制)生成稳定的UUID
    const stableId = await computeSHA256Hex(bundlePath);
    const uuid = [
      stableId.slice(0, 8),
      stableId.slice(8, 12),
      stableId.slice(12, 16),
      stableId.slice(16, 20),
      stableId.slice(20, 32),
    ].join('-');

    // 使用稳定的 createdAt：bundle hash 不变则返回相同时间戳，避免重复下载
    // hash 变化时生成新的 createdAt 并持久化，确保新更新被 expo-updates 接受
    const createdAt = getOrCreateCreatedAt(stableId);

    // scopeKey必须与App配置中的scopeKey一致
    // UpdatesConfiguration.maybeGetDefaultScopeKey: scopeKey默认为updateUrl的origin
    // updateUrl = http://localhost:8080/api/manifest, origin = http://localhost:8080
    const scopeKey = `http://${host}:${port}`;

    const manifest = {
      id: uuid,
      runtimeVersion: runtimeVersion,
      createdAt: createdAt,
      assets: assets,
      launchAsset: launchAsset,
      extra: {
        expoClient: {
          version: '1.0.0',
          releaseChannel: 'default',
        },
        scopeKey: scopeKey,
      },
      metadata: {},
    };

    console.log(`Serving manifest for ${platform}, assets: ${assets.length}`);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'expo-protocol-version': '1',
      'expo-sfv-version': '0',
      'expo-runtime-version': runtimeVersion,
    });
    res.end(JSON.stringify(manifest));
  } catch (e) {
    console.error('Manifest error:', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid manifest' }));
  }
}

function serveFile(res, filePath, contentType) {
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 更新服务器已启动`);
  console.log(`📍 本地地址: http://localhost:${PORT}`);
  console.log(`📱 设备地址: http://198.18.0.1:${PORT}`);
  console.log(`📦 更新目录: ${DIST_DIR}`);
  console.log(`\n使用说明:`);
  console.log(`  1. 运行 'npx expo export --platform android' 导出更新包`);
  console.log(`  2. 更新包会自动输出到 dist/android 目录`);
  console.log(`  3. 手机 App 启动时会自动检查更新\n`);
});