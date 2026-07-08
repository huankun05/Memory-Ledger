import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ============ Middleware ============
app.use(cors());
app.use(express.json());

// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ============ Database ============
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    purchase_price INTEGER NOT NULL,
    purchase_date TEXT NOT NULL,
    location_id TEXT,
    current_location TEXT,
    image_urls TEXT,
    warranty_end_date TEXT,
    warranty_document TEXT,
    notes TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    level TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS location_history (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    from_location_id TEXT,
    to_location_id TEXT NOT NULL,
    moved_at TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id)
  );
`);

// ============ Helpers ============
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function success<T>(data: T) {
  return { success: true, data };
}

function errorResp(message: string) {
  return { success: false, error: message };
}

// ============ AI Recognition ============
app.post('/api/ai/recognize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json(errorResp('请上传图片文件'));
      return;
    }

    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const apiKey = process.env.DOUBAO_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'doubao-vision-pro',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: '请识别这张图片中的物品，返回纯 JSON，包含：name（物品名称）, category（品类：digital/appliance/clothing/book/collection/other）, brand（品牌）, confidence（置信度0-1）, tags（标签数组，最多3个）, estimatedPrice（预估购入价格）。只返回 JSON，不要任何其他文字。' },
                { type: 'image_url', image_url: { url: imageBase64 } },
              ],
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
            res.json(success(parsed));
            return;
          }
        }
      } catch (e) {
        console.error('AI API 调用失败，降级到模拟数据:', e);
      }
    }

    // 降级：模拟识别结果
    const mockItems = [
      { name: '索尼 WH-1000XM5', category: 'digital', brand: 'SONY', confidence: 0.982, tags: ['耳机', '降噪', '数码'], estimatedPrice: 2800 },
      { name: '戴森 V12 Detect Slim', category: 'appliance', brand: 'Dyson', confidence: 0.956, tags: ['吸尘', '家电', '清洁'], estimatedPrice: 4500 },
      { name: 'iPhone 15 Pro', category: 'digital', brand: 'Apple', confidence: 0.971, tags: ['手机', '数码', '旗舰'], estimatedPrice: 7999 },
      { name: 'MacBook Pro 14', category: 'digital', brand: 'Apple', confidence: 0.968, tags: ['笔记本', '数码', '办公'], estimatedPrice: 14999 },
      { name: '北面 1996 复古羽绒服', category: 'clothing', brand: 'The North Face', confidence: 0.890, tags: ['羽绒服', '衣物', '冬季'], estimatedPrice: 2000 },
      { name: '始祖鸟 Beta AR 冲锋衣', category: 'clothing', brand: "ARC'TERYX", confidence: 0.875, tags: ['户外', '衣物', '冲锋衣'], estimatedPrice: 5500 },
      { name: '徕卡 Q3 相机', category: 'collection', brand: 'Leica', confidence: 0.920, tags: ['相机', '收藏', '摄影'], estimatedPrice: 45000 },
      { name: '戴森 Airwrap 卷发棒', category: 'appliance', brand: 'Dyson', confidence: 0.940, tags: ['美妆', '家电', '造型'], estimatedPrice: 3600 },
    ];
    const result = mockItems[Math.floor(Math.random() * mockItems.length)];
    res.json(success(result));
  } catch (e) {
    console.error('AI 识别错误:', e);
    res.status(500).json(errorResp('识别失败，请重试'));
  }
});

// ============ Items CRUD ============
const itemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['digital', 'appliance', 'clothing', 'book', 'collection', 'other']),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchasePrice: z.number().int().nonnegative(),
  purchaseDate: z.string(),
  locationId: z.string().optional(),
  currentLocation: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  warrantyEndDate: z.string().optional(),
  warrantyDocument: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

app.get('/api/items', (_req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY updated_at DESC').all();
  const parsed = (items as any[]).map((item) => ({
    ...item,
    purchasePrice: parseInt(item.purchase_price),
    imageUrls: item.image_urls ? JSON.parse(item.image_urls) : [],
    tags: item.tags ? JSON.parse(item.tags) : [],
  }));
  res.json(success(parsed));
});

app.post('/api/items', (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResp(parsed.error.message));
    return;
  }
  const data = parsed.data;
  const id = generateId('item');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO items (id, name, category, brand, model, purchase_price, purchase_date,
      location_id, current_location, image_urls, warranty_end_date, warranty_document,
      notes, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.category, data.brand || null, data.model || null,
    data.purchasePrice, data.purchaseDate, data.locationId || null, data.currentLocation || null,
    JSON.stringify(data.imageUrls || []), data.warrantyEndDate || null, data.warrantyDocument || null,
    data.notes || null, JSON.stringify(data.tags || []), now, now
  );

  res.json(success({ id, ...data, createdAt: now, updatedAt: now }));
});

app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body;
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.category !== undefined) { fields.push('category = ?'); values.push(patch.category); }
  if (patch.brand !== undefined) { fields.push('brand = ?'); values.push(patch.brand); }
  if (patch.purchasePrice !== undefined) { fields.push('purchase_price = ?'); values.push(patch.purchasePrice); }
  if (patch.purchaseDate !== undefined) { fields.push('purchase_date = ?'); values.push(patch.purchaseDate); }
  if (patch.locationId !== undefined) { fields.push('location_id = ?'); values.push(patch.locationId); }
  if (patch.currentLocation !== undefined) { fields.push('current_location = ?'); values.push(patch.currentLocation); }
  if (patch.imageUrls !== undefined) { fields.push('image_urls = ?'); values.push(JSON.stringify(patch.imageUrls)); }
  if (patch.warrantyEndDate !== undefined) { fields.push('warranty_end_date = ?'); values.push(patch.warrantyEndDate); }
  if (patch.notes !== undefined) { fields.push('notes = ?'); values.push(patch.notes); }
  if (patch.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(patch.tags)); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(success({ id, ...patch, updatedAt: now }));
});

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  db.prepare('DELETE FROM location_history WHERE item_id = ?').run(id);
  res.json(success({ id }));
});

// ============ Locations ============
app.get('/api/locations', (_req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY sort_order ASC').all();
  res.json(success(locations));
});

app.post('/api/locations', (req, res) => {
  const { name, parentId, level, sortOrder } = req.body;
  if (!name || !level) {
    res.status(400).json(errorResp('缺少必填字段'));
    return;
  }
  const id = generateId('loc');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO locations (id, name, parent_id, level, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, parentId || null, level, sortOrder || 0, now);
  res.json(success({ id, name, parentId, level, sortOrder: sortOrder || 0, createdAt: now }));
});

// ============ Location History ============
app.get('/api/items/:id/history', (req, res) => {
  const { id } = req.params;
  const history = db.prepare(
    'SELECT * FROM location_history WHERE item_id = ? ORDER BY moved_at DESC'
  ).all(id);
  res.json(success(history));
});

app.post('/api/items/:id/move', (req, res) => {
  const { id } = req.params;
  const { toLocationId, note } = req.body;
  if (!toLocationId) {
    res.status(400).json(errorResp('缺少目标位置'));
    return;
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
  if (!item) {
    res.status(404).json(errorResp('物品不存在'));
    return;
  }

  const histId = generateId('hist');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO location_history (id, item_id, from_location_id, to_location_id, moved_at, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(histId, id, item.location_id || null, toLocationId, now, note || null);

  db.prepare('UPDATE items SET location_id = ?, updated_at = ? WHERE id = ?')
    .run(toLocationId, now, id);

  res.json(success({ id: histId, itemId: id, toLocationId, movedAt: now }));
});

// ============ Warranties ============
app.get('/api/warranties/expiring', (_req, res) => {
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const items = db.prepare(
    'SELECT * FROM items WHERE warranty_end_date IS NOT NULL AND warranty_end_date <= ? ORDER BY warranty_end_date ASC'
  ).all(thirtyDaysLater.toISOString().split('T')[0]);

  const result = (items as any[]).map((item) => ({
    itemId: item.id,
    itemName: item.name,
    category: item.category,
    expireDate: item.warranty_end_date,
    daysLeft: Math.ceil((new Date(item.warranty_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  }));

  res.json(success(result));
});

// ============ Backup ============
app.get('/api/backup', (_req, res) => {
  const items = db.prepare('SELECT * FROM items').all();
  const locations = db.prepare('SELECT * FROM locations').all();
  const history = db.prepare('SELECT * FROM location_history').all();
  res.json(success({ items, locations, history, exportedAt: new Date().toISOString() }));
});

// ============ Health Check ============
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ Error Handler ============
app.use((err: Error, _req: any, res: any, _next: any) => {
  console.error('Server Error:', err);
  res.status(500).json(errorResp('服务器内部错误'));
});

// ============ Start ============
app.listen(PORT, () => {
  console.log(`✅ 后端服务已启动: http://localhost:${PORT}`);
  console.log(`📦 数据库: ${dbPath}`);
});
