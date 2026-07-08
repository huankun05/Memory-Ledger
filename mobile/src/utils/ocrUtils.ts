import TextRecognition, { TextRecognitionResult, TextBlock } from '@react-native-ml-kit/text-recognition';
import { ItemCategory } from '../types';

export interface ExtractedItemInfo {
  name?: string;
  brand?: string;
  category?: ItemCategory;
  tags: string[];
  confidence: number;
}

const BRAND_KEYWORDS: Record<string, string[]> = {
  electronics: ['apple', 'samsung', 'huawei', 'xiaomi', 'sony', 'bose', 'dell', 'lenovo', 'hp', 'asus', 'lg', 'canon', 'nikon', 'logitech', 'microsoft', 'nintendo'],
  clothing: ['nike', 'adidas', 'uniqlo', 'zara', 'hm', 'gucci', 'lv', 'prada', 'chanel', 'puma', 'under armour', 'canada goose'],
  food: ['nestle', 'coca-cola', 'pepsi', 'mcdonald', 'kfc', '蒙牛', '伊利', '光明', '三全'],
  kitchen: ['zwilling', '双立人', '九阳', '美的', '德龙', 'delonghi', 'ninjia'],
  furniture: ['ikea', '宜家', 'herman miller', '源氏木语', '乐歌'],
};

const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
  electronics: ['phone', '手机', 'laptop', '笔记本', '电脑', 'camera', '相机', 'headphone', '耳机', 'tablet', '平板', 'watch', '手表', 'speaker', '音箱', 'keyboard', '键盘', 'mouse', '鼠标', 'monitor', '显示器', 'tv', '电视'],
  clothing: ['shirt', 't恤', 'pants', '裤子', 'dress', '裙子', 'shoes', '鞋', 'jacket', '外套', 'hat', '帽子', 'bag', '包'],
  books: ['book', '书', 'novel', '小说', 'magazine', '杂志', 'textbook', '课本'],
  kitchen: ['pot', '锅', 'pan', '平底锅', 'bowl', '碗', 'cup', '杯子', 'plate', '盘子', 'knife', '刀', 'spoon', '勺'],
  furniture: ['chair', '椅子', 'table', '桌子', 'sofa', '沙发', 'bed', '床', 'desk', '书桌', 'shelf', '架子', 'cabinet', '柜子'],
  sports: ['ball', '球', 'racket', '球拍', 'dumbbell', '哑铃', 'yoga', '瑜伽', 'bike', '自行车'],
  toys: ['doll', '玩偶', 'puzzle', '拼图', 'lego', '乐高', 'car', '玩具车', 'teddy', '泰迪熊'],
  tools: ['screwdriver', '螺丝刀', 'hammer', '锤子', 'wrench', '扳手', 'drill', '电钻', 'saw', '锯子'],
  documents: ['passport', '护照', 'id', '身份证', 'certificate', '证书', 'contract', '合同', 'receipt', '收据'],
  cosmetics: ['lipstick', '口红', 'foundation', '粉底', 'cream', '面霜', 'serum', '精华', 'perfume', '香水'],
  medicine: ['pill', '药片', 'capsule', '胶囊', 'syrup', '糖浆', 'ointment', '药膏', 'vitamin', '维生素'],
  food: ['snack', '零食', 'drink', '饮料', 'biscuit', '饼干', 'chocolate', '巧克力', 'noodle', '面条'],
  accessories: ['ring', '戒指', 'necklace', '项链', 'earring', '耳环', 'bracelet', '手链', 'glasses', '眼镜'],
  shoes: ['sneaker', '运动鞋', 'boot', '靴子', 'sandal', '凉鞋', 'high heel', '高跟鞋', 'slipper', '拖鞋'],
  bags: ['backpack', '背包', 'handbag', '手提包', 'wallet', '钱包', 'tote', '托特包', 'luggage', '行李箱'],
  homeAppliances: ['fridge', '冰箱', 'washing', '洗衣机', 'microwave', '微波炉', 'fan', '风扇', 'air conditioner', '空调', 'tv', '电视'],
  digitalAccessories: ['cable', '线', 'charger', '充电器', 'adapter', '适配器', 'usb', 'hub', '集线器', 'case', '壳'],
  stationery: ['pen', '笔', 'pencil', '铅笔', 'notebook', '笔记本', 'eraser', '橡皮', 'ruler', '尺子', 'stapler', '订书机'],
  plants: ['flower', '花', 'succulent', '多肉', 'cactus', '仙人掌', 'pot plant', '盆栽', 'herb', '草药'],
  art: ['painting', '画', 'sculpture', '雕塑', 'handicraft', '手工艺品', 'decoration', '装饰'],
  collectibles: ['stamp', '邮票', 'coin', '硬币', 'figure', '手办', 'card', '卡片', 'antique', '古董'],
  musicalInstruments: ['guitar', '吉他', 'piano', '钢琴', 'violin', '小提琴', 'drum', '鼓', 'flute', '笛子'],
  cameras: ['camera', '相机', 'lens', '镜头', 'tripod', '三脚架', 'filter', '滤镜'],
  automotive: ['car part', '汽车配件', 'tool', '工具', 'tire', '轮胎', 'oil', '机油'],
  baby: ['diaper', '尿布', 'bottle', '奶瓶', 'toy', '玩具', 'stroller', '婴儿车', 'car seat', '安全座椅'],
  petSupplies: ['dog food', '狗粮', 'cat food', '猫粮', 'pet toy', '宠物玩具', 'cage', '笼子'],
  outdoor: ['tent', '帐篷', 'sleeping bag', '睡袋', 'hiking', '徒步', 'camping', '露营'],
  other: [],
};

// 判断是否为乱码
function isGarbledText(text: string): boolean {
  if (!text || text.length === 0) return true;

  const garbledPatterns = [
    /[一-龥]{1,2}[a-zA-Z]{10,}/g,
    /[a-zA-Z]{1,2}[一-龥]{5,}/g,
    /[?!@#$%^&*()]{3,}/g,
  ];

  for (const pattern of garbledPatterns) {
    if (pattern.test(text)) return true;
  }

  const validChars = text.replace(/[a-zA-Z0-9\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g, '');
  const ratio = validChars.length / text.length;
  if (ratio > 0.5) return true;

  return false;
}

function cleanText(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[^\w\s\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff-.()（）【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidItemName(text: string): boolean {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 30) return false;
  if (isGarbledText(cleaned)) return false;

  const hasValidChars = /[a-zA-Z0-9\u4e00-\u9fa5]/.test(cleaned);
  if (!hasValidChars) return false;

  const excludePatterns = [
    /^(http|www)/i,
    /^\d+$/,
    /^[#$%^&*]+$/,
    /(test|测试|示例)/i,
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(cleaned)) return false;
  }

  return true;
}

export async function extractItemInfo(source: string): Promise<ExtractedItemInfo> {
  try {
    let allText = '';
    let lines: string[] = [];

    // 判断 source 是图片路径还是纯文本
    if (source.startsWith('/') || source.startsWith('file:') || source.startsWith('content:')) {
      // 图片路径，使用 ML Kit 识别
      const result: TextRecognitionResult = await TextRecognition.recognize(source);

      if (!result || !result.text || result.text.trim().length === 0) {
        return { tags: [], confidence: 0 };
      }

      const blocks: TextBlock[] = result.blocks || [];
      const cleanedBlocks = blocks
        .map((block: TextBlock) => ({
          text: cleanText(block.text || ''),
        }))
        .filter((block: { text: string }) => block.text.length > 0 && !isGarbledText(block.text));

      if (cleanedBlocks.length === 0) {
        return { tags: [], confidence: 0 };
      }

      allText = cleanedBlocks.map((b: { text: string }) => b.text.toLowerCase()).join(' ');
      lines = cleanedBlocks.map((b: { text: string }) => b.text);
    } else {
      // 纯文本，直接处理
      const rawLines = source.split('\n').map(l => cleanText(l)).filter(l => l.length > 0 && !isGarbledText(l));
      if (rawLines.length === 0) {
        return { tags: [], confidence: 0 };
      }
      allText = rawLines.map(l => l.toLowerCase()).join(' ');
      lines = rawLines;
    }

    const info: ExtractedItemInfo = {
      tags: [],
      confidence: 0,
    };

    // 检测类别
    let categoryScore = 0;
    let detectedCategory: ItemCategory = 'other';

    Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
      const cat = category as ItemCategory;
      let score = 0;
      keywords.forEach((keyword) => {
        if (allText.includes(keyword.toLowerCase())) {
          score += 2;
        }
      });
      if (score > categoryScore) {
        categoryScore = score;
        detectedCategory = cat;
      }
    });

    if (categoryScore > 0) {
      info.category = detectedCategory;
      info.confidence = Math.min(0.9, categoryScore * 0.1);
    }

    // 检测品牌
    let detectedBrand: string | undefined;
    Object.entries(BRAND_KEYWORDS).forEach(([, brands]) => {
      brands.forEach((brand) => {
        if (allText.includes(brand.toLowerCase()) && !detectedBrand) {
          detectedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
        }
      });
    });

    if (detectedBrand) {
      info.brand = detectedBrand;
      info.tags.push(detectedBrand);
      info.confidence = Math.min(1, info.confidence + 0.2);
    }

    // 提取物品名称
    const validNames = lines.filter((line: string) => isValidItemName(line));

    if (validNames.length > 0) {
      const bestName = validNames.find((name: string) => name.length >= 3 && name.length <= 15)
        || validNames[0];

      if (bestName) {
        info.name = bestName.slice(0, 50);
        info.confidence = Math.min(1, info.confidence + 0.2);
      }
    }

    // 提取标签
    cleanedBlocks.forEach((block: { text: string }) => {
      const text = block.text;
      if (text.length >= 2 && text.length <= 20 && !isGarbledText(text)) {
        const hasKeyword = Object.values(CATEGORY_KEYWORDS).some(keywords =>
          keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
        );
        if (hasKeyword && !info.tags.includes(text) && info.tags.length < 5) {
          info.tags.push(text);
        }
      }
    });

    return info;
  } catch (error) {
    console.warn('OCR extraction failed:', error);
    return { tags: [], confidence: 0 };
  }
}
