/**
 * scripts/seed_rich_data.ts
 *
 * 此文件包含数据完善逻辑，通过以下方式之一执行：
 *
 * 方式 A（推荐）：在 App.tsx 中临时引入并调用
 *    import { seedRichData } from './scripts/seed_rich_data'
 *    await seedRichData()
 *
 * 方式 B：通过 Expo DevTools 控制台执行
 *    await import('./scripts/seed_rich_data').then(m => m.seedRichData())
 *
 * 执行后删除调用代码即可。
 */

import {
  initDatabase,
  getAllItems,
  getAllLocations,
  clearAllData,
  seedDemoData,
  createLocation,
  createItem,
} from '../src/database/db';

type ItemDef = {
  name: string;
  category: string;
  brand: string;
  purchasePrice: number;
  purchaseDate: string;
  locName: string;
  tags?: string[];
  notes?: string;
  quantity?: number;
  purchaseStore?: string;
  serialNumber?: string;
  status?: string;
  warrantyEndDate?: string;
};

// ─── 子位置定义（相对于父位置名） ───
const subLocations = [
  // Level 2 — 家下
  { name: '客厅', parent: '家', level: 1 },
  { name: '阳台', parent: '家', level: 1 },
  { name: '玄关', parent: '家', level: 1 },
  { name: '储物间', parent: '家', level: 1 },
  // Level 2 — 卧室下
  { name: '衣柜', parent: '卧室', level: 2 },
  { name: '床头柜', parent: '卧室', level: 2 },
  // Level 2 — 厨房下
  { name: '冰箱', parent: '厨房', level: 2 },
  { name: '橱柜', parent: '厨房', level: 2 },
  // Level 2 — 书房下
  { name: '书架', parent: '书房', level: 2 },
  { name: '抽屉柜', parent: '书房', level: 2 },
  // Level 2 — 公司下
  { name: '工位', parent: '公司', level: 1 },
  { name: '茶水间', parent: '公司', level: 1 },
  // Level 3 — 会议室下
  { name: '投影仪柜', parent: '会议室', level: 2 },
];

// ─── 新增物品定义（按目标位置名分组） ───
const newItems: ItemDef[] = [
  // ── 客厅 ──
  { name: '索尼 OLED 电视 A95L',      category: 'electronics', brand: 'Sony',       purchasePrice: 1999900, purchaseDate: '2023-10-15', locName: '客厅', quantity: 1, purchaseStore: '索尼官方旗舰店', serialNumber: 'SONY-A95L-65-2024Q1', notes: '65英寸 QD-OLED 杜比视界 IQ' },
  { name: 'Bose Soundbar 900',         category: 'electronics', brand: 'Bose',       purchasePrice: 499900,  purchaseDate: '2023-11-20', locName: '客厅', quantity: 1, purchaseStore: 'Bose官方旗舰店',  serialNumber: 'SB900-CN-2024',      notes: '沉浸式家庭影院套装' },
  { name: 'Nintendo Switch OLED',      category: 'electronics', brand: 'Nintendo',   purchasePrice: 259900,  purchaseDate: '2023-08-05', locName: '客厅', quantity: 1, purchaseStore: '京东国际',       serialNumber: 'HAD-S-KABAA-CHN',    notes: '白色日版' },
  { name: '懒人沙发',                  category: 'furniture',   brand: 'Lazy Bag',   purchasePrice: 69900,   purchaseDate: '2024-01-12', locName: '客厅', quantity: 1, purchaseStore: '天猫',           notes: '豆袋沙发 XL 灰色' },

  // ── 阳台 ──
  { name: '多肉盆栽套装',              category: 'plants',      brand: '花彩家',     purchasePrice: 15900,   purchaseDate: '2024-05-20', locName: '阳台', quantity: 1, purchaseStore: '淘宝',           notes: '12株组合 含陶瓷盆' },
  { name: '好太太折叠晾衣架',          category: 'homeAppliances',brand:'好太太',    purchasePrice: 29900,   purchaseDate: '2023-08-10', locName: '阳台', quantity: 1, purchaseStore: '京东',           serialNumber: 'HT-YJ-2023-0891',    notes: '不锈钢落地式' },
  { name: '石头扫地机器人 G10S',      category: 'homeAppliances',brand:'石头',      purchasePrice: 299900,  purchaseDate: '2024-02-25', locName: '阳台', quantity: 1, purchaseStore: '石头旗舰店',     serialNumber: 'RK-G10S-2024-0112',  notes: '自动集尘 激光导航' },

  // ── 玄关 ──
  { name: '小米智能门锁 Pro',          category: 'homeAppliances',brand:'小米',     purchasePrice: 129900,  purchaseDate: '2023-06-01', locName: '玄关', quantity: 1, purchaseStore: '小米商城',       serialNumber: 'MJ-ZNMS-S2-20230001', notes: '指纹+密码+NFC' },
  { name: '源氏木语实木鞋柜',          category: 'furniture',   brand: '源氏木语',   purchasePrice: 159900,  purchaseDate: '2022-05-15', locName: '玄关', quantity: 1, purchaseStore: '源氏木语旗舰店', notes: '三层 可放24双鞋' },
  { name: 'Paragon 自动折叠伞',         category: 'accessories', brand: 'Paragon',   purchasePrice: 19900,   purchaseDate: '2024-04-25', locName: '玄关', quantity: 2, purchaseStore: '名创优品',       notes: '晴雨两用' },

  // ── 储物间 ──
  { name: '博世电钻套装 GSB 550',      category: 'tools',       brand: '博世',       purchasePrice: 89900,   purchaseDate: '2023-05-20', locName: '储物间', quantity: 1, purchaseStore: '京东',           serialNumber: 'BS-GSB550-2023',    notes: '冲击钻套装', status: 'idle' },
  { name: '露营折叠椅套装 x4',         category: 'furniture',   brand: '迪卡侬',     purchasePrice: 24900,   purchaseDate: '2022-09-10', locName: '储物间', quantity: 4, purchaseStore: '迪卡侬',         notes: '蓝色 x4' },
  { name: '飞利浦蒸汽电熨斗',           category: 'homeAppliances',brand:'飞利浦',  purchasePrice: 35900,   purchaseDate: '2023-08-05', locName: '储物间', quantity: 1, purchaseStore: '京东',           serialNumber: 'PH-GC503-2023',     notes: '2600W' },
  { name: '速干沙滩巾 x2',              category: 'sports',      brand: '迪卡侬',     purchasePrice: 7900,    purchaseDate: '2023-05-28', locName: '储物间', quantity: 2, purchaseStore: '迪卡侬',         notes: '160x90cm' },

  // ── 衣柜 ──
  { name: '春秋轻薄羽绒服',             category: 'clothing',    brand: '优衣库',     purchasePrice: 49900,   purchaseDate: '2023-04-01', locName: '衣柜', quantity: 1, purchaseStore: '优衣库线下',     notes: '藏青色 L' },
  { name: 'Canada Goose 派克大衣',     category: 'clothing',    brand: '加拿大鹅',   purchasePrice: 680000,  purchaseDate: '2021-02-15', locName: '衣柜', quantity: 1, purchaseStore: '加拿大鹅官网',   serialNumber: 'CG-EXP-BLK-M-2022', notes: 'Expedition 黑色 M' },
  { name: '蓝豹正装西装',               category: 'clothing',    brand: '蓝豹',       purchasePrice: 480000,  purchaseDate: '2021-10-10', locName: '衣柜', quantity: 1, purchaseStore: '蓝豹线下专柜',   notes: '深蓝色 48码' },
  { name: 'UA运动内衣 x3',              category: 'clothing',    brand: 'Under Armour',purchasePrice: 39900,  purchaseDate: '2024-03-05', locName: '衣柜', quantity: 3, purchaseStore: '天猫UA旗舰店',   notes: '高强度支撑 黑色 M' },

  // ── 床头柜 ──
  { name: '米家床头灯 2',               category: 'homeAppliances',brand:'小米',     purchasePrice: 19900,   purchaseDate: '2022-12-15', locName: '床头柜', quantity: 1, purchaseStore: '小米商城',       serialNumber: 'MJ-MJCTD02YL',       notes: '语音控制' },
  { name: '无印良品香薰机',             category: 'homeAppliances',brand:'无印良品', purchasePrice: 45000,   purchaseDate: '2021-07-20', locName: '床头柜', quantity: 1, purchaseStore: '无印良品线下',   serialNumber: 'MUJI-AROM-3500',     notes: '3.5L' },
  { name: 'Kindle Paperwhite 11',       category: 'electronics', brand: 'Amazon',    purchasePrice: 99800,   purchaseDate: '2022-11-01', locName: '床头柜', quantity: 1, purchaseStore: '亚马逊海外购',   serialNumber: 'B09KP4K8P3',         notes: '6.8英寸 墨水屏' },
  { name: '3M 降噪耳塞',                category: 'accessories', brand: '3M',        purchasePrice: 3900,    purchaseDate: '2024-05-20', locName: '床头柜', quantity: 5, purchaseStore: '超市',           notes: 'NRR 29dB' },
  { name: 'Contigo 运动水壶',           category: 'sports',      brand: 'Contigo',   purchasePrice: 12900,   purchaseDate: '2024-04-10', locName: '床头柜', quantity: 2, purchaseStore: '天猫',           notes: '750ml' },

  // ── 冰箱 ──
  { name: '蒙牛纯牛奶 x24',             category: 'food',        brand: '蒙牛',      purchasePrice: 5900,    purchaseDate: '2024-06-25', locName: '冰箱', quantity: 1, purchaseStore: '超市',           notes: '250ml x24' },
  { name: '三全冷冻水饺',               category: 'food',        brand: '三全',      purchasePrice: 3500,    purchaseDate: '2024-06-22', locName: '冰箱', quantity: 2, purchaseStore: '超市',           notes: '猪肉白菜 450g x4' },
  { name: '光明如实酸奶',               category: 'food',        brand: '光明',      purchasePrice: 8900,    purchaseDate: '2024-06-26', locName: '冰箱', quantity: 1, purchaseStore: '超市',           notes: '135g x12' },
  { name: '黄天鹅可生食鸡蛋',           category: 'food',        brand: '黄天鹅',    purchasePrice: 2900,    purchaseDate: '2024-06-20', locName: '冰箱', quantity: 1, purchaseStore: '超市',           notes: '30枚' },
  { name: '安佳无盐黄油',               category: 'food',        brand: '安佳',      purchasePrice: 4500,    purchaseDate: '2024-06-18', locName: '冰箱', quantity: 2, purchaseStore: '超市',           notes: '454g' },

  // ── 橱柜 ──
  { name: '双立人铸铁炒锅 30cm',        category: 'kitchen',     brand: '双立人',    purchasePrice: 128000,  purchaseDate: '2022-11-01', locName: '橱柜', quantity: 1, purchaseStore: '双立人专柜',     notes: '熟铁炒锅' },
  { name: '日式陶瓷餐具套装 16头',      category: 'kitchen',     brand: '唯鼎',      purchasePrice: 39900,   purchaseDate: '2022-07-15', locName: '橱柜', quantity: 1, purchaseStore: '淘宝',           notes: '16头碗盘套装' },
  { name: '十八子作刀具七件套',         category: 'kitchen',     brand: '十八子作',  purchasePrice: 68000,   purchaseDate: '2021-01-20', locName: '橱柜', quantity: 1, purchaseStore: '京东',           notes: '含刀架' },
  { name: '九阳空气炸锅 5.5L',          category: 'kitchen',     brand: '九阳',      purchasePrice: 59900,   purchaseDate: '2024-04-10', locName: '橱柜', quantity: 1, purchaseStore: '天猫',           serialNumber: 'JOYONG-KL55-VF735',  notes: '可视窗口' },
  { name: '美的IH电饭煲 4L',            category: 'kitchen',     brand: '美的',      purchasePrice: 69900,   purchaseDate: '2022-12-25', locName: '橱柜', quantity: 1, purchaseStore: '京东',           serialNumber: 'Midea-MB-FB40-2023', notes: '不粘内胆' },

  // ── 书架 ──
  { name: '《人类简史》',               category: 'books',       brand: '中信出版社',purchasePrice: 6800,    purchaseDate: '2021-05-01', locName: '书架', quantity: 1, purchaseStore: '当当网',         notes: '尤瓦尔·赫拉利 著' },
  { name: '《原则》',                   category: 'books',       brand: '中信出版社',purchasePrice: 9800,    purchaseDate: '2022-01-15', locName: '书架', quantity: 1, purchaseStore: '当当网',         notes: '瑞·达利欧 著' },
  { name: '《深入理解计算机系统》',     category: 'books',       brand: '机械工业出版社',purchasePrice: 13900, purchaseDate: '2022-07-20', locName: '书架', quantity: 1, purchaseStore: '京东',           notes: 'CSAPP' },
  { name: '《三体》全集',               category: 'books',       brand: '重庆出版社',purchasePrice: 16800,   purchaseDate: '2020-02-10', locName: '书架', quantity: 1, purchaseStore: '当当网',         notes: '刘慈欣 精装版' },
  { name: '铁三角黑胶唱机 LP120X',     category: 'electronics', brand: '铁三角',    purchasePrice: 398000,  purchaseDate: '2022-10-01', locName: '书架', quantity: 1, purchaseStore: '铁三角旗舰店',   serialNumber: 'AT-LP120X-CHN-2401', notes: 'USB直驱' },
  { name: 'Yamaha F600 民谣吉他',      category: 'musicalInstruments', brand: 'Yamaha', purchasePrice: 159900, purchaseDate: '2019-01-15', locName: '书架', quantity: 1, purchaseStore: '雅马哈旗舰店', serialNumber: 'YM-F600-2022-0771', notes: '41寸', status: 'idle' },

  // ── 抽屉柜 ──
  { name: '西部数据 My Book 8TB',      category: 'electronics', brand: '西部数据',   purchasePrice: 89900,   purchaseDate: '2024-05-10', locName: '抽屉柜', quantity: 1, purchaseStore: '京东',           serialNumber: 'WD-MB-8TB-2024',   notes: '外置硬盘 8TB' },
  { name: '贝尔金雷电3扩展坞',          category: 'digitalAccessories', brand: '贝尔金', purchasePrice: 69900, purchaseDate: '2024-08-01', locName: '抽屉柜', quantity: 1, purchaseStore: '苹果官网',       notes: '12合1' },
  { name: 'GoPro Hero 12 Black',        category: 'cameras',     brand: 'GoPro',     purchasePrice: 329900,  purchaseDate: '2024-03-20', locName: '抽屉柜', quantity: 1, purchaseStore: '京东',           serialNumber: 'GP-H12-BLK-2024-0023', notes: '含额外电池x2' },
  { name: '汉印口袋打印机 MT800',       category: 'electronics', brand: '汉印',       purchasePrice: 49900,   purchaseDate: '2024-07-05', locName: '抽屉柜', quantity: 1, purchaseStore: '京东',           notes: '热敏打印机' },
  { name: '得力A4文件收纳盒 x5',        category: 'stationery',  brand: '得力',      purchasePrice: 7900,    purchaseDate: '2022-11-01', locName: '抽屉柜', quantity: 1, purchaseStore: '得力旗舰店',     notes: '白色' },
  { name: '绿联 M.2 硬盘盒',            category: 'digitalAccessories', brand: '绿联', purchasePrice: 15900,  purchaseDate: '2024-01-15', locName: '抽屉柜', quantity: 1, purchaseStore: '京东',           notes: 'NVMe固态硬盘盒' },

  // ── 工位 ──
  { name: '乐歌电动升降桌 E2',          category: 'furniture',   brand: '乐歌',       purchasePrice: 289900,  purchaseDate: '2022-09-15', locName: '工位', quantity: 1, purchaseStore: '乐歌旗舰店',     serialNumber: 'LG-E2-140-WN',     notes: '1.4m 胡桃木色' },
  { name: '米乔人体工学腰靠',           category: 'furniture',   brand: '米乔',       purchasePrice: 29800,   purchaseDate: '2022-03-08', locName: '工位', quantity: 1, purchaseStore: '天猫',           notes: '减压腰垫' },
  { name: 'HP LaserJet M132nw',         category: 'electronics', brand: '惠普',       purchasePrice: 129900,  purchaseDate: '2021-06-10', locName: '工位', quantity: 1, purchaseStore: '惠普官网',       serialNumber: 'HP-LJ-M132-CNB12345', notes: '黑白激光一体机' },
  { name: '罗技 MX Keys',               category: 'electronics', brand: 'Logitech',  purchasePrice: 69900,   purchaseDate: '2022-08-01', locName: '工位', quantity: 1, purchaseStore: '罗技旗舰店',     serialNumber: 'LG-MXKEYS-2024',   notes: '无线机械键盘' },
  { name: '北弧双臂显示器支架 E350',    category: 'electronics', brand: '北弧',       purchasePrice: 35900,   purchaseDate: '2022-02-20', locName: '工位', quantity: 1, purchaseStore: '京东',           serialNumber: 'NB-E350-2024',     notes: '双臂支架' },
  { name: 'Lamy Safari 钢笔',           category: 'stationery',  brand: 'Lamy',       purchasePrice: 35900,   purchaseDate: '2021-09-10', locName: '工位', quantity: 1, purchaseStore: 'Lamy专柜',       notes: '磨砂黑 F尖' },
  { name: '象印保温杯',                  category: 'kitchen',     brand: 'Zojirushi',  purchasePrice: 26900,   purchaseDate: '2024-06-15', locName: '工位', quantity: 2, purchaseStore: '日本代购',       notes: '480ml 深蓝色' },

  // ── 茶水间 ──
  { name: '德龙全自动咖啡机',           category: 'kitchen',     brand: '德龙',       purchasePrice: 249900,  purchaseDate: '2022-12-05', locName: '茶水间', quantity: 1, purchaseStore: '德龙旗舰店',     serialNumber: 'DL-ECAM22-CHN-001', notes: '意式全自动' },
  { name: '美的即热饮水机',             category: 'kitchen',     brand: '美的',       purchasePrice: 45900,   purchaseDate: '2022-05-12', locName: '茶水间', quantity: 1, purchaseStore: '京东',           notes: '3L 台式速热' },
  { name: '金镶玉功夫茶具',             category: 'kitchen',     brand: '金镶玉',     purchasePrice: 29900,   purchaseDate: '2021-12-18', locName: '茶水间', quantity: 1, purchaseStore: '京东',           notes: '紫砂壶+6杯' },

  // ── 投影仪柜 ──
  { name: '极米 H5 激光投影仪',         category: 'electronics', brand: '极米',       purchasePrice: 599900,  purchaseDate: '2024-01-08', locName: '投影仪柜', quantity: 1, purchaseStore: '极米旗舰店',     serialNumber: 'XGIMI-H5-CN-20240001', notes: '家用智能激光' },
  { name: '红叶电动投影幕 120寸',       category: 'electronics', brand: '红叶',       purchasePrice: 69900,   purchaseDate: '2024-01-08', locName: '投影仪柜', quantity: 1, purchaseStore: '京东',           notes: '16:9 电动升降' },
  { name: 'JBL会议音响套装',            category: 'electronics', brand: 'JBL',        purchasePrice: 329900,  purchaseDate: '2024-03-15', locName: '投影仪柜', quantity: 1, purchaseStore: '京东',           serialNumber: 'JBL-CS-2024-056',  notes: '壁挂音箱x2+功放' },
];

/** 默认标签映射（用于未指定 tags 的物品） */
const defaultTags: Record<string, string[]> = {
  electronics: ['数码', '科技'],
  furniture: ['家具', '家居'],
  clothing: ['衣物', '穿戴'],
  kitchen: ['厨房', '烹饪'],
  sports: ['运动', '健身'],
  books: ['书籍', '阅读'],
  cosmetics: ['美妆', '护肤'],
  tools: ['工具', '维修'],
  homeAppliances: ['家电', '电器'],
  stationery: ['文具', '办公'],
  accessories: ['配饰', '日用品'],
  plants: ['植物', '阳台'],
  musicalInstruments: ['乐器', '音乐'],
  cameras: ['相机', '拍摄'],
  food: ['食品', '食材'],
  digitalAccessories: ['数码', '配件'],
};

export async function seedRichData() {
  const db = await initDatabase();

  // 清空旧数据并重建
  await clearAllData();
  await seedDemoData();

  // 获取所有位置（seedDemoData 插入后的）
  const locations = await getAllLocations();
  const locMap = new Map(locations.map((l) => [l.name, l.id]));

  // 插入子位置
  let newLocCount = 0;
  for (const sub of subLocations) {
    const parentId = locMap.get(sub.parent);
    if (!parentId) {
      console.warn(`⚠️  父位置不存在: ${sub.parent}，跳过 ${sub.name}`);
      continue;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await db.runAsync(
      'INSERT OR IGNORE INTO locations (id, name, parentId, level, createdAt) VALUES (?, ?, ?, ?, ?)',
      [id, sub.name, parentId, sub.level, new Date().toISOString()]
    );
    locMap.set(sub.name, id);
    newLocCount++;
  }
  console.log(`✅ 新增子位置: ${newLocCount} 个`);

  // 插入新物品
  let newItemCount = 0;
  const skipped: string[] = [];

  for (const item of newItems) {
    const locationId = locMap.get(item.locName);
    if (!locationId) {
      skipped.push(item.name);
      continue;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const created = new Date().toISOString();

    await db.runAsync(
      `INSERT OR IGNORE INTO items
       (id, name, category, brand, purchasePrice, purchaseDate, locationId,
        warrantyEndDate, tags, notes, createdAt, updatedAt,
        consumptionType, quantity, purchaseStore, serialNumber, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, item.name, item.category, item.brand,
        item.purchasePrice, item.purchaseDate, locationId,
        item.warrantyEndDate ?? null,
        JSON.stringify(item.tags ?? defaultTags[item.category] ?? ['其他']),
        item.notes ?? null,
        created, created,
        item.status === 'idle' ? 'durable' : 'durable',
        item.quantity ?? 1,
        item.purchaseStore ?? null,
        item.serialNumber ?? null,
        item.status ?? 'inUse',
      ]
    );
    newItemCount++;
  }

  if (skipped.length) {
    console.warn(`⚠️  跳过 ${skipped.length} 个物品（位置未找到）:`, skipped.join(', '));
  }
  console.log(`✅ 新增物品: ${newItemCount} 个`);

  // 添加收藏
  const recentItems = await db.getAllAsync<any>('SELECT id FROM items ORDER BY createdAt DESC LIMIT 5');
  for (const r of recentItems) {
    await db.runAsync('INSERT OR IGNORE INTO favorites (itemId, createdAt) VALUES (?, ?)', [r.id, new Date().toISOString()]);
  }
  console.log(`✅ 新增收藏: ${recentItems.length} 个`);

  // 添加位置历史
  const movedItems = await db.getAllAsync<any>('SELECT id, locationId FROM items ORDER BY createdAt DESC LIMIT 8');
  for (let i = 0; i < movedItems.length; i++) {
    const item = movedItems[i];
    const fromId = locations.find((l) => l.id !== item.locationId)?.id;
    if (fromId) {
      const movedAtTime = new Date(Date.now() - 86400000 * (i + 10)).toISOString();
      await db.runAsync(
        'INSERT OR IGNORE INTO location_history (id, itemId, fromLocationId, toLocationId, movedAt) VALUES (?, ?, ?, ?, ?)',
        [`${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, item.id, fromId, item.locationId, movedAtTime]
      );
      // 更新物品的 movedAt 为最后一次移动时间
      await db.runAsync('UPDATE items SET movedAt = ? WHERE id = ?', [movedAtTime, item.id]);
    }
  }
  console.log('✅ 新增位置历史记录');

  // 统计
  const [totalItems, totalLocs, totalFavs] = await Promise.all([
    db.getFirstAsync<any>('SELECT COUNT(*) as c FROM items'),
    db.getFirstAsync<any>('SELECT COUNT(*) as c FROM locations'),
    db.getFirstAsync<any>('SELECT COUNT(*) as c FROM favorites'),
  ]);

  console.log('\n📊 数据统计:');
  console.log(`  位置: ${totalLocs?.c} 个`);
  console.log(`  物品: ${totalItems?.c} 个`);
  console.log(`  收藏: ${totalFavs?.c} 个`);
  console.log('\n🎉 数据完善完成！');
}
