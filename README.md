# 拾忆 · 物语 (Memory Ledger)

> 个人全生命周期物品记忆溯源与价值资产管理系统

![GitHub license](https://img.shields.io/github/license/huankun05/Memory-Ledger)
![GitHub stars](https://img.shields.io/github/stars/huankun05/Memory-Ledger)

---

## 🌟 产品概述

**「拾忆 · 物语」** 是一款面向个人用户的物品全生命周期管理应用，旨在帮助用户系统化管理个人实物资产，解决「找不到东西」「忘记质保到期」「闲置物品堆积」三大核心痛点。

### 🎯 核心价值主张

- **不再丢失**：每一次物品移动都有记录，轨迹可追溯
- **不再浪费**：实时资产价值评估，折旧一目了然
- **不再错过**：质保到期智能提醒，权益不再流失

---

## 📱 功能特性

### 🏠 首页 Dashboard
- 资产总价值展示
- 品类分布环形图
- 质保到期提醒（30天内）
- 最近动态活动流

### 📦 物品管理
- AI 拍照智能识别建档
- 分类筛选（数码/家电/衣物/书籍/藏品）
- 搜索支持（名称/品牌/标签）
- 物品详情与编辑

### 🗺️ 位置记忆
- 房间/柜体树形结构
- 物品位置分布统计
- 移动轨迹记录与溯源

### 👤 个人中心
- 资产统计与概览
- 数据导出备份
- 主题切换（浅色/深色）
- 语言切换（中文/English）

---

## 🛠️ 技术架构

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.75+ | 移动端框架 |
| TypeScript | 5 | 类型安全 |
| Expo | 51 | 开发工具链 |
| Tailwind CSS | 3 | 样式框架 |
| Zustand | 4 | 状态管理 |
| SQLite (expo-sqlite) | - | 本地存储 |
| i18next | - | 国际化 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Express | 4 | HTTP 框架 |
| TypeScript | 5 | 类型安全 |
| better-sqlite3 | 11 | SQLite 数据库 |
| multer | 1 | 文件上传 |
| zod | 3 | 数据校验 |

### 项目结构

```
Memory-Ledger/
├── mobile/              # React Native 移动端应用
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── store/       # Zustand 状态管理
│   │   ├── database/    # SQLite 数据库
│   │   ├── theme/       # 主题系统
│   │   ├── i18n/        # 国际化
│   │   └── utils/       # 工具函数
│   └── package.json
│
├── backend/             # Express 后端服务
│   ├── src/
│   │   └── index.ts     # 入口文件
│   └── package.json
│
├── web/                 # Vite + React Web 演示版
│   ├── src/
│   └── package.json
│
├── .trae/               # TRAE 项目文档
│   ├── PRD.md           # 产品需求文档
│   └── PRODUCT_INTRO.md # 产品介绍书
└── README.md
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Expo CLI >= 6

### 安装与运行

#### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装移动端依赖
cd ../mobile
npm install

# 安装 Web 版依赖（可选）
cd ../web
npm install
```

#### 2. 运行后端服务

```bash
cd backend
npm run dev
# 服务运行在 http://localhost:3001
```

#### 3. 运行移动端

```bash
cd mobile
npm start
```

使用 Expo Go 扫码预览，或运行：

```bash
# iOS 模拟器
npm run ios

# Android 模拟器
npm run android

# Web 预览
npm run web
```

#### 4. 运行 Web 演示版

```bash
cd web
npm run dev
# 服务运行在 http://localhost:5173
```

---

## 🌐 部署

### Web 版本部署

项目已配置 GitHub Pages 支持。推送后自动部署：

```bash
# 构建 mobile Web 版本
cd mobile
npx expo export --platform web

# 部署到 GitHub Pages
git subtree push --prefix mobile/dist origin gh-pages
```

### 后端部署

后端可以部署到 Railway、Vercel 或其他 Node.js 托管服务：

```bash
cd backend
npm run build
npm start
```

---

## 📊 资产估值算法

采用**复利递减法**计算物品残值：

```
残值 = 购入价 × (1 - 折旧率)^使用年限
```

| 品类 | 年折旧率 |
|------|----------|
| 数码产品 | 25% |
| 家用电器 | 18% |
| 衣物 | 35% |
| 书籍 | 10% |
| 收藏品 | 5% |

---

## 📝 License

MIT License

---

> **拾忆 · 物语** —— 记录每一件物品的故事，让生活更有条理。
>
> TRAE AI 创造力大赛 · 生活娱乐赛道参赛作品