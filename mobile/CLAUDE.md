@AGENTS.md
# 拾忆·物语 — Mobile App

## 屏幕适配规范（2026-07-01 更新）

所有页面 header 必须使用 `useSafeAreaInsets().top` 替代硬编码 paddingTop: 48：
- ✅ 已完成：HomePage, ItemsPage, ProfilePage, SettingsPage, ItemDetailPage, LocationPage, AddPage, AddManualPage

屏幕尺寸应使用 `useWindowDimensions()`（动态）替代 `Dimensions.get('window')`（静态）：
- ✅ 已完成：HomePage, ProfilePage, LocationPage
- 保留静态 Dimensions: CropPage（一次性计算）、DatePicker（固定组件）

关键布局宽度使用组合：`flex: 1` + `minWidth: <百分比>` 实现自适应行数。
