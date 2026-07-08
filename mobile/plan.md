# 拾忆·物语 — 移动应用开发规划

## 项目概述

基于 React Native + Expo + TypeScript + Zustand 的移动端物品管理应用，支持物品录入、位置管理、折旧计算、保修提醒等功能。

## 技术栈

- **框架**: React Native 0.85 + Expo 56
- **语言**: TypeScript
- **状态管理**: Zustand
- **导航**: React Navigation v7
- **数据库**: Expo SQLite
- **主题**: Custom ThemeContext
- **国际化**: i18next
- **图标**: Lucide React Native

## 目录结构

```
src/
├── components/     # 公共组件
├── context/        # React Context
├── database/       # SQLite 数据库
├── hooks/          # 自定义 Hooks
├── i18n/           # 国际化
├── navigation/     # 导航配置
├── pages/          # 页面组件
├── store/          # Zustand 状态管理
├── theme/          # 主题系统
├── types/          # TypeScript 类型
└── utils/          # 工具函数
```

## 核心功能

### 1. 首页 (HomePage)
- 健康评分系统
- 资产概览
- 分类价值排行
- 快捷功能入口

### 2. 物品列表 (ItemsPage)
- 搜索、筛选、排序
- 收藏筛选
- 多选批量操作

### 3. 物品详情 (ItemDetailPage)
- 残值与日均成本计算
- 基本信息快速编辑
- 保修信息与状态
- 位置历史记录

### 4. 位置管理 (LocationPage)
- 树形层级结构
- 位置地图可视化
- 搜索定位

### 5. 拍照添加物品 & AI 识别
- 自由裁剪 (CropPage)
- 背景移除 (U2Net ONNX)
- OCR 文字识别 (PaddleOCR + ML Kit)
- 自动填表

### 6. 设置 (SettingsPage)
- 主题模式 (浅色/深色/跟随系统)
- 5 种配色方案
- 语言切换
- 数据管理

### 7. 个人中心 (ProfilePage)
- 健康分详情卡
- 月度消费趋势图

### 8. 保修提醒 (WarrantyReminderPage)
- 过期/即将到期物品列表
- 按保修剩余时间排序

## 主题系统

- 3 种模式: light / dark / system
- 5 种配色: warm / ocean / forest / rose / twilight
- 通过 ThemeContext 提供 colors 和 isDark

## 国际化

- 语言: 中文 (zh) / 英文 (en)
- 使用 i18next + react-i18next

## 开发规范

- TypeScript: 零 any 策略
- 组件: 单文件 < 300 行
- 安全区域: useSafeAreaInsets()
- 屏幕适配: useWindowDimensions()

## 构建命令

```bash
# Android 开发构建
npx expo run:android

# Android Release 构建
npx expo run:android --variant Release

# OTA 热更新
npx expo export --platform android
```

## 更新记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-07-01 | v1.0 | 项目初始化，安全区域适配 |
| 2026-07-02 | v1.1 | UI 升级，健康分系统 |
| 2026-07-03 | v1.2 | 数据导出导入重构，保修提醒优化 |
| 2026-07-04 | v1.3 | 图片裁剪，背景移除，OCR 识别 |
| 2026-07-05 | v1.4 | 项目清理，文档更新 |