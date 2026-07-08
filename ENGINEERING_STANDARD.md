# 工程规范 · Engineering Standard

> 「拾忆 · 物语」React Native 移动应用开发规范
> 目标：**稳定健壮 · 可拓展 · 高性能 · 简小精悍 · 无屎山代码**

---

## 1. 项目结构规范

```
mobile/
├── src/
│   ├── components/           # 公共组件（< 300 行/个）
│   │   ├── CategoryPickerModal.tsx
│   │   ├── DatePicker.tsx
│   │   ├── LocationMapCanvas.tsx
│   │   ├── LocationTreePicker.tsx
│   │   ├── PieChart.tsx
│   │   └── UpdateManager.tsx
│   ├── context/              # React Context
│   │   └── DataContext.tsx
│   ├── database/             # SQLite 数据库操作
│   │   └── db.ts
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useInitData.ts
│   │   └── useToast.ts
│   ├── i18n/                 # 国际化配置
│   │   └── index.ts
│   ├── navigation/           # 导航配置
│   │   └── AppNavigator.tsx
│   ├── pages/                # 页面级组件
│   │   ├── HomePage.tsx
│   │   ├── ItemsPage.tsx
│   │   ├── ItemDetailPage.tsx
│   │   ├── LocationPage.tsx
│   │   ├── AddPage.tsx
│   │   ├── AddManualPage.tsx
│   │   ├── CropPage.tsx
│   │   ├── WarrantyReminderPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── AboutPage.tsx
│   │   └── HelpPage.tsx
│   ├── store/                # Zustand 状态管理
│   │   └── index.ts
│   ├── theme/                # 主题系统
│   │   ├── ThemeContext.tsx
│   │   └── colors.ts
│   ├── types/                # TypeScript 类型定义
│   │   └── index.ts
│   └── utils/                # 工具函数
│       ├── categoryIcons.ts
│       ├── categoryLabel.ts
│       ├── formatters.ts
│       ├── itemCalculations.ts
│       ├── imageUtils.ts
│       ├── bgRemover.ts
│       ├── ocrUtils.ts
│       ├── paddleOCR.ts
│       └── autoLayout.ts
├── assets/                   # 静态资源（图标、启动页）
├── scripts/                  # 脚本（种子数据等）
├── android/                  # Android 原生模块
├── package.json
├── tsconfig.json
├── app.json
└── plan.md                   # 项目计划
```

---

## 2. 代码规范

### 2.1 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 组件 | PascalCase | `ItemDetailPage.tsx` |
| 函数/变量 | camelCase | `calculateResidualValue()` |
| 常量 | UPPER_SNAKE_CASE | `DEPRECIATION_RATE` |
| Hooks | `use` 开头 | `useItems.ts` |
| 文件 | kebab-case（组件除外） | `category-icons.ts` |
| 接口 | `I` 前缀或直接名词 | `Item`, `ILocation` |
| 类型别名 | 直接名词 | `ItemCategory`, `ConsumptionType` |

### 2.2 组件规范

1. **单一职责**：每个组件只做一件事
2. **行数限制**：单文件 < 300 行，超过则拆分
3. **纯函数优先**：使用 `function` 或箭头函数
4. **无副作用**：不在组件中直接执行异步操作
5. **样式分离**：使用 `StyleSheet.create()`
6. **props 类型**：必须定义 `interface Props`

### 2.3 状态管理规范

| 场景 | 方案 |
|---|---|
| 局部状态 | `useState` |
| 跨组件共享 | Zustand |
| 全局 Context | React Context（主题、数据） |
| 持久化 | SQLite |

**Zustand 最佳实践**：
- 使用细粒度选择器（`useItems`, `useLocations` 等）
- 避免全量订阅导致的不必要重渲染
- 按领域拆分 store

### 2.4 类型安全

1. **零 any 策略**：禁止使用 `any`，必要时用 `unknown` + 类型守卫
2. **接口定义**：所有数据结构必须有接口
3. **Props 类型**：所有组件必须定义 Props 接口
4. **返回类型**：所有函数必须指定返回类型

---

## 3. 样式规范

### 3.1 基础规则

1. **StyleSheet.create**：所有样式必须通过 `StyleSheet.create()` 创建
2. **主题色获取**：通过 `useTheme()` 获取颜色，禁止硬编码颜色值
3. **响应式尺寸**：使用 `useWindowDimensions()` 替代静态 `Dimensions.get('window')`
4. **安全区域**：使用 `useSafeAreaInsets()` 替代硬编码 `paddingTop: 48`

### 3.2 命名规范

```typescript
const styles = StyleSheet.create({
  container: {},           // 外层容器
  header: {},              // 头部
  title: {},               // 标题
  content: {},             // 内容区
  card: {},                // 卡片
  button: {},              // 按钮
  text: {},                // 文本
  row: {},                 // 水平布局
  col: {},                 // 垂直布局
  gap: {},                 // 间距
});
```

### 3.3 设计 Token

主题色通过 `ThemeContext` 提供：

| Token | 用途 |
|---|---|
| `primary` | 主色调 |
| `secondary` | 辅色调 |
| `surface` | 卡片/面板背景 |
| `background` | 页面背景 |
| `text` | 主文本 |
| `textSecondary` | 次要文本 |
| `border` | 边框颜色 |
| `error` | 错误状态 |
| `success` | 成功状态 |

---

## 4. 性能规范

### 4.1 列表优化

1. **FlatList 参数**：
   - `removeClippedSubviews`：启用
   - `initialNumToRender`：10
   - `maxToRenderPerBatch`：10
   - `windowSize`：5
2. **renderItem 优化**：使用 `useCallback` 包裹
3. **数据预计算**：使用 `useMemo` 预计算筛选排序结果

### 4.2 渲染优化

1. **组件 memo 化**：使用 `React.memo` 包裹纯展示组件
2. **避免不必要重渲染**：使用 `useMemo`/`useCallback`
3. **图片优化**：使用 `resizeMode` 和合适尺寸
4. **避免匿名函数**：在 render 中避免创建匿名函数

### 4.3 内存管理

1. **清理定时器**：组件卸载时清理 `setTimeout`/`setInterval`
2. **取消网络请求**：组件卸载时取消未完成的请求
3. **释放资源**：原生模块使用完后调用 `release()`

---

## 5. 国际化规范

### 5.1 翻译键命名

```
page.section.element
```

示例：
- `home.title`
- `add.ocrRun`
- `settings.themeMode`

### 5.2 支持语言

| 语言 | 代码 |
|---|---|
| 中文 | `zh` |
| 英文 | `en` |

### 5.3 使用方式

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

<Text>{t('home.title')}</Text>
```

---

## 6. 数据库规范

### 6.1 表结构

**items 表**：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT | 主键，UUID |
| name | TEXT | 物品名称 |
| category | TEXT | 分类 |
| brand | TEXT | 品牌（可选） |
| purchasePrice | INTEGER | 购买价格（分） |
| purchaseDate | TEXT | 购买日期（ISO） |
| locationId | TEXT | 位置 ID（可选） |
| warrantyEndDate | TEXT | 保修截止日期（可选） |
| tags | TEXT | 标签（JSON） |
| notes | TEXT | 备注（可选） |
| imageUrl | TEXT | 图片路径（可选） |
| consumptionType | TEXT | 消耗类型 |
| createdAt | TEXT | 创建时间 |
| updatedAt | TEXT | 更新时间 |
| movedAt | TEXT | 移动时间 |

**locations 表**：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT | 主键，UUID |
| name | TEXT | 位置名称 |
| parentId | TEXT | 父位置 ID（可选） |
| level | INTEGER | 层级 |
| layout | TEXT | 布局配置（JSON，可选） |
| createdAt | TEXT | 创建时间 |

### 6.2 操作规范

1. **事务处理**：批量操作使用事务
2. **参数化查询**：使用 `?` 占位符，避免 SQL 注入
3. **错误处理**：所有数据库操作必须有 try-catch
4. **时间戳**：使用 ISO 格式字符串存储时间

---

## 7. 原生模块规范

### 7.1 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 模块类 | 后缀 `Module` | `BgRemoverModule.kt` |
| Package 类 | 后缀 `Package` | `BgRemoverPackage.kt` |
| 导出名称 | PascalCase | `BgRemover` |

### 7.2 接口规范

```typescript
// 输入参数
interface RemoveBackgroundParams {
  inputPath: string;
  outputPath: string;
}

// 返回结果
interface RemoveBackgroundResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}
```

### 7.3 初始化模式

所有原生模块必须实现 `initialize()` 和 `release()` 方法：

```typescript
class BgRemoverService {
  private initialized = false;

  async init(): Promise<boolean> { /* ... */ }
  async release(): Promise<void> { /* ... */ }
}
```

---

## 8. 代码审查清单

### 8.1 必查项

- [ ] 类型安全（无 any）
- [ ] 组件行数 < 300 行
- [ ] 样式通过 StyleSheet.create 创建
- [ ] 主题色通过 useTheme 获取
- [ ] 安全区域使用 useSafeAreaInsets
- [ ] 屏幕尺寸使用 useWindowDimensions
- [ ] 状态管理遵循规范
- [ ] 错误处理完善
- [ ] 性能优化（useMemo/useCallback）
- [ ] 国际化支持

### 8.2 推荐项

- [ ] 组件 memo 化
- [ ] 列表使用 FlatList 优化参数
- [ ] 数据库操作使用事务
- [ ] 原生模块有 init/release
- [ ] 定时器有清理逻辑

---

## 9. Git 提交规范

### 9.1 提交格式

```
<type>(<scope>): <description>

<optional body>
```

### 9.2 类型说明

| 类型 | 说明 |
|---|---|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不影响功能） |
| `style` | 样式调整 |
| `docs` | 文档更新 |
| `test` | 测试相关 |
| `chore` | 构建/工具配置 |
| `perf` | 性能优化 |

### 9.3 示例

```
feat(crop): 实现自由裁剪框拖拽和8手柄调整

- 使用 TouchableWithoutFeedback + 原生触摸事件
- 支持8个方向手柄调整裁剪框大小
- 添加边界限制和最小尺寸检查
```

---

## 10. 构建与部署

### 10.1 开发构建

```bash
cd mobile

# Android 开发构建
npx expo run:android

# Android Release 构建
npx expo run:android --variant Release
```

### 10.2 OTA 热更新

```bash
# 启动更新服务
node update-server.js

# 构建更新包
npx expo export --platform android

# 复制到更新目录
cp -r dist/* ./dist/
```

> **注意**：expo-updates 在 debug 构建中禁用，必须使用 Release APK 才能测试 OTA。

---

## 11. 版本历史

| 日期 | 版本 | 变更说明 |
|---|---|---|
| 2026-07-01 | v1.0 | 项目初始化，基础框架搭建 |
| 2026-07-02 | v1.1 | UI 升级（液态玻璃），健康分系统 |
| 2026-07-03 | v1.2 | AI 拍照建档，位置地图可视化 |
| 2026-07-04 | v1.3 | 图片裁剪，背景移除（U2Net），OCR 识别 |
| 2026-07-05 | v1.4 | 项目清理，文档更新，代码规范完善 |