# OTA 热更新完整流程指南

本文档记录了「物品记忆」App 的 Expo OTA 热更新完整启动与使用流程，供后续再次使用。

---

## 一、环境前提

| 项目 | 说明 |
|------|------|
| 工作目录 | `f:\Work\contest\Trae-create\mobile` |
| 包名 | `com.mobile` |
| 运行时版本 | `1.0.0` |
| 热更新服务端口 | `8080` |
| 更新服务文件 | `update-server.js` |
| 更新包输出目录 | `dist/` |
| Manifest 接口 | `http://localhost:8080/api/manifest` |

**关键约束**：expo-updates 在 **debug 构建**中禁用，必须使用 **release 构建** 的 APK 才能测试 OTA。

---

## 二、完整启动流程（日常使用）

> 假设 Release APK 已安装过。若未安装，先看「三、首次构建 Release APK」。

### 步骤 1：启动 Android 模拟器

```powershell
# 列出可用 AVD
emulator -list-avds

# 启动模拟器（替换为你的 AVD 名称）
emulator -avd <AVD名称>

# 确认设备已连接
adb devices
# 应输出: emulator-5554   device
```

### 步骤 2：配置 adb 端口转发

将模拟器的 `localhost:8080` 和 `localhost:8081` 转发到宿主机，使 App 能访问本机的热更新服务器。

```powershell
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8081 tcp:8081

# 验证转发状态
adb reverse --list
# 应输出:
# host-16 tcp:8081 tcp:8081
# host-16 tcp:8080 tcp:8080
```

### 步骤 3：启动热更新服务器

```powershell
cd f:\Work\contest\Trae-create\mobile
node update-server.js
```

看到以下输出说明启动成功：
```
🚀 更新服务器已启动
📍 本地地址: http://localhost:8080
📦 更新目录: f:\Work\contest\Trae-create\mobile\dist
```

> 服务器需保持运行，不要关闭该终端窗口。

### 步骤 4：验证服务器正常

```powershell
# 测试 manifest 接口（PowerShell 下用 curl.exe）
curl.exe -s -H "expo-runtime-version: 1.0.0" -H "expo-platform: android" http://localhost:8080/api/manifest
```

应返回 JSON，包含 `id`（UUID 格式）、`assets`、`launchAsset` 等字段。

---

## 三、首次构建 Release APK（仅首次需要）

### 3.1 解决 Windows 路径长度问题

ninja 有 260 字符路径限制，用 `subst` 映射短路径：

```powershell
# 将长路径映射为 T: 盘
subst T: f:\Work\contest\Trae-create\mobile
# 后续构建命令在 T: 盘下执行
cd T:\
```

### 3.2 构建 Release APK

```powershell
cd T:\android
./gradlew assembleRelease
```

构建产物路径：
```
android/app/build/outputs/apk/release/app-release.apk
```

### 3.3 安装到模拟器

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

---

## 四、日常热更新流程

每次修改代码后，推送 OTA 更新的步骤：

### 步骤 1：修改代码

正常编辑 `src/` 下的源码文件。

### 步骤 2：导出更新包

```powershell
cd f:\Work\contest\Trae-create\mobile
npx expo export --platform android
```

导出成功后会输出：
```
› android bundles (1):
_expo/static/js/android/index-xxxxxxxxxxxx.hbc (6MB)

Exported: dist
```

导出后 `dist/` 目录包含：
- `metadata.json` — 更新元数据
- `_expo/static/js/android/*.hbc` — JS bundle
- `assets/*` — 资源文件

### 步骤 3：重启 App 触发更新

```powershell
# 强制停止并重新启动 App
adb shell am force-stop com.mobile
adb shell monkey -p com.mobile -c android.intent.category.LAUNCHER 1
```

### 步骤 4：验证更新生效

```powershell
# 等待 10 秒后查看日志
Start-Sleep -Seconds 10
adb logcat -d -s ReactNativeJS:V | Select-String -Pattern "UpdateManager|isAvailable|Download|reload"
```

**成功标志**（日志应依次出现）：
```
[UpdateManager] Starting update check...
[UpdateManager] Update check result: {"isAvailable":true,...}     ← 检测到新更新
[UpdateManager] Auto-downloading update...                         ← 开始下载
[UpdateManager] Download complete, reloading...                    ← 下载完成（SHA-256 验证通过）
[UpdateManager] Starting update check...                           ← 重启后再次检查
[UpdateManager] Update check result: {"isAvailable":false,"reason":"updateRejectedBySelectionPolicy"}  ← 无新更新，无无限循环
```

---

## 五、更新机制说明

### 5.1 自动更新（UpdateManager.tsx）

App 内的 `UpdateManager.tsx` 组件实现了自动更新：

1. App 启动后 2 秒，自动调用 `Updates.checkForUpdateAsync()` 检查更新
2. 若 `isAvailable: true`，自动调用 `Updates.fetchUpdateAsync()` 下载
3. 下载完成后 500ms，自动调用 `Updates.reloadAsync()` 重启应用
4. 重启后再次检查，若已是最新则停止（`updateRejectedBySelectionPolicy`）

**无需手动操作**，只需重启 App 即可自动完成更新。

### 5.2 手动检查更新（SettingsPage.tsx）

设置页"系统工具"区块提供手动"检查更新"入口（`handleCheckUpdate`）：

1. 用户点击"检查更新"按钮
2. 调用 `Updates.checkForUpdateAsync()` 检查是否有新版本
3. 若有更新：显示提示 → `fetchUpdateAsync()` 下载 → `reloadAsync()` 重启
4. 若无更新：显示"已是最新版本"
5. 若出错：显示错误提示

**适用场景**：用户想立即检查更新而不重启 App，或自动更新失败后手动重试。

---

## 六、常见问题及解决方案

### 问题 1：资源下载失败（SHA-256 验证不匹配）

**现象**：日志报 `verifySHA256AndWriteToFile` 失败，`Failed to download asset`。

**原因**：expo-updates 的 `verifySHA256AndWriteToFile` 期望 **Base64URL 编码** 的 SHA-256 哈希，而非十六进制编码。

**解决**：`update-server.js` 中 `computeSHA256` 函数必须使用 `base64url`：
```javascript
stream.on('end', () => resolve(hash.digest('base64url')));  // ✅ 正确
// stream.on('end', () => resolve(hash.digest('hex')));     // ❌ 错误
```

### 问题 2：无限更新循环（应用反复重启）

**现象**：App 反复重启，`restartCount` 不断增长，每次检查都返回 `isAvailable: true`。

**原因**：manifest 的 `createdAt` 每次请求都不同（如用 `new Date().toISOString()`），expo-updates 认为每次都是新更新。

**解决**：使用 bundle 文件的修改时间作为稳定的 `createdAt`：
```javascript
const bundleStat = fs.statSync(bundlePath);
const createdAt = bundleStat.mtime.toISOString();
```

### 问题 3：Manifest ID 格式非法

**现象**：expo-updates 拒绝 manifest，日志报 ID 格式错误。

**解决**：`id` 必须是 UUID 格式（`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）。基于 bundle 的 SHA-256 十六进制哈希生成稳定 UUID：
```javascript
const stableId = await computeSHA256Hex(bundlePath);
const uuid = [
  stableId.slice(0, 8),
  stableId.slice(8, 12),
  stableId.slice(12, 16),
  stableId.slice(16, 20),
  stableId.slice(20, 32),
].join('-');
```

### 问题 4：Release 模式无法访问 HTTP

**现象**：App 无法连接 `http://localhost:8080`。

**原因**：Release 模式默认禁止明文 HTTP 流量。

**解决**：在 `android/app/src/main/AndroidManifest.xml` 的 `<application>` 标签添加：
```xml
android:usesCleartextTraffic="true"
```

### 问题 5：Windows 路径过长导致构建失败

**现象**：ninja 报路径超过 260 字符错误。

**解决**：用 `subst` 映射短路径（见三、3.1 节）。

> **注意 subst + autolinking 冲突**：`subst T:` 后，`expo-modules-autolinking` 和 `expo-updates` 的 `findPackageJsonPathAsync`/`findUpProjectRoot` 函数因循环条件 `path.dirname(dir) !== dir` 在盘符根目录直接退出，导致找不到 `T:\package.json`。
>
> **已应用的 patch**（`npm install` 后需重新应用）：
> 1. `node_modules/expo-modules-autolinking/build/commands/autolinkingOptions.js` — `findPackageJsonPathAsync` 改为先检查再判断根目录
> 2. `node_modules/expo-updates/utils/build/findUpProjectRoot.js` — 同上修复
>
> **expo-updates AndroidManifest 配置**：`android/app/src/main/AndroidManifest.xml` 需手动添加 expo-updates 的 meta-data 标签（ENABLED、EXPO_UPDATE_URL、EXPO_RUNTIME_VERSION 等），以及 `android:usesCleartextTraffic="true"`。`res/values/strings.xml` 需添加 `expo_runtime_version` 字符串资源。

### 问题 6：Debug 构建不检查更新

**现象**：`checkForUpdateAsync` 不生效或报错。

**原因**：expo-updates 在 debug 模式下禁用。

**解决**：必须使用 release 构建的 APK。

### 问题 7：热更新日志显示成功但 UI 未变化

**现象**：日志显示 `[UpdateManager] Download complete, reloading...`，但重启后 UI 仍是旧版本。

**原因**：`expo-updates` 缓存了旧 bundle，新下载的 bundle 未被加载。

**解决**：清除应用缓存强制重新下载 bundle：
```powershell
# 方案 A：仅清除缓存（推荐，保留数据）
adb shell pm clear com.mobile

# 方案 B：强制停止 + 清除 + 重启
adb shell am force-stop com.mobile
adb shell pm clear com.mobile
adb shell monkey -p com.mobile -c android.intent.category.LAUNCHER 1
```

**验证**：清除后重启，观察日志确认加载了新 bundle：
```powershell
Start-Sleep -Seconds 12
adb logcat -d -s ReactNativeJS:V | Select-String -Pattern "UpdateManager|isAvailable"
```

### 问题 8：热更新服务器未运行

**现象**：App 启动后无任何 `[UpdateManager]` 日志，或日志报连接超时。

**原因**：`update-server.js` 未启动，或 8080 端口被占用。

**解决**：
```powershell
# 1. 检查 8080 端口是否被占用
netstat -ano | findstr :8080 | findstr LISTENING

# 2. 若未运行，启动服务器
cd f:\Work\contest\Trae-create\mobile
node update-server.js

# 3. 确认 adb 端口转发已配置
adb reverse tcp:8080 tcp:8080
adb reverse --list
```

---

## 七、关键文件说明

| 文件 | 作用 |
|------|------|
| `update-server.js` | 热更新服务器，提供 manifest 和文件下载 |
| `src/components/UpdateManager.tsx` | App 内自动更新组件，启动时检查并应用更新 |
| `src/pages/SettingsPage.tsx` | 设置页，包含手动"检查更新"功能 (handleCheckUpdate) |
| `app.json` | OTA 配置（`updates.url`、`runtimeVersion`） |
| `android/app/src/main/AndroidManifest.xml` | 允许明文 HTTP 流量 |
| `android/gradle.properties` | 构建配置（`reactNativeArchitectures=x86_64`） |
| `dist/metadata.json` | 导出的更新包元数据 |

### app.json 关键配置

```json
{
  "updates": {
    "enabled": true,
    "checkAutomatically": "ON_LOAD",
    "fallbackToCacheTimeout": 0,
    "url": "http://localhost:8080/api/manifest"
  },
  "runtimeVersion": "1.0.0"
}
```

---

## 八、快速启动命令汇总

```powershell
# ===== 一次性配置 =====
subst T: f:\Work\contest\Trae-create\mobile

# ===== 日常启动流程 =====
# 1. 启动模拟器
emulator -avd <AVD名称>

# 2. 配置端口转发
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8081 tcp:8081

# 3. 启动热更新服务器（保持终端运行）
cd f:\Work\contest\Trae-create\mobile
node update-server.js

# ===== 推送更新 =====
# 4. 修改代码后导出更新包
cd f:\Work\contest\Trae-create\mobile
npx expo export --platform android

# 5. 重启 App 触发更新
adb shell am force-stop com.mobile
adb shell monkey -p com.mobile -c android.intent.category.LAUNCHER 1

# 6. 验证更新
Start-Sleep -Seconds 10
adb logcat -d -s ReactNativeJS:V | Select-String -Pattern "UpdateManager|isAvailable|Download|reload"

# ===== 首次构建 Release APK =====
cd T:\android
./gradlew assembleRelease
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

---

## 九、架构说明

```
┌─────────────────┐     adb reverse      ┌──────────────────┐
│  Android 模拟器  │  localhost:8080 ←→   │  宿主机           │
│                 │                       │                  │
│  App (Release)  │  1.请求 manifest      │  update-server.js│
│  +UpdateManager │ ──────────────────→   │  (端口 8080)     │
│                 │  ←──────────────────  │                  │
│  expo-updates   │  2.返回 manifest      │                  │
│  (原生模块)      │                       │  dist/           │
│                 │  3.下载 bundle/assets │  ├ metadata.json │
│                 │ ──────────────────→   │  ├ _expo/...hbc  │
│                 │  ←──────────────────  │  └ assets/       │
│                 │  4.SHA-256验证+保存    │                  │
│                 │  5.reloadAsync 重启   │                  │
└─────────────────┘                       └──────────────────┘
```

**更新流程**：
1. App 启动 → UpdateManager 调用 `checkForUpdateAsync()` 请求 manifest
2. 服务器返回 manifest（含 bundle 和 assets 的 Base64URL SHA-256 哈希）
3. expo-updates 下载 bundle 和 assets，逐个验证 SHA-256
4. 验证通过后保存到 `.expo-internal` 目录
5. `reloadAsync()` 重启 App，加载新版本
6. 重启后再次检查，manifest ID 未变则停止（`updateRejectedBySelectionPolicy`）

---

## 十、USB 真机调试

### 10.1 真机准备

1. **开启开发者模式**: 设置 → 关于手机 → 连续点击版本号 7 次
2. **开启 USB 调试**: 设置 → 开发者选项 → USB 调试（开）+ USB 安装（开）
3. **连接电脑**: USB 线连接，选择「传输文件（MTP）」模式
4. **授权调试**: 手机弹出「允许 USB 调试」对话框 → 允许

### 10.2 验证连接

```powershell
# 列出所有已连接设备
adb devices

# 查看设备详情（型号等）
adb devices -l
```

真机设备序列号示例：
- 华为/荣耀: `AXGY9X4110W00690` 等
- 模拟器: `emulator-5554`

### 10.3 多设备时指定设备

当同时连接模拟器和真机时，所有 adb 命令必须指定 `-s <序列号>`：

```powershell
# 安装 APK 到指定设备
adb -s AXGY9X4110W00690 install -r app-release.apk

# 端口转发
adb -s AXGY9X4110W00690 reverse tcp:8080 tcp:8080

# 启动应用
adb -s AXGY9X4110W00690 shell am start -n com.mobile/.MainActivity

# 停止应用
adb -s AXGY9X4110W00690 shell am force-stop com.mobile

# 查看日志
adb -s AXGY9X4110W00690 logcat -d | findstr /i "UpdateManager"
```

### 10.4 真机热更新完整步骤

```powershell
# 1. 确认设备连接
adb devices -l

# 2. 配置端口转发（热更新服务器 8080）
adb -s AXGY9X4110W00690 reverse tcp:8080 tcp:8080

# 3. 确保热更新服务器运行
netstat -ano | findstr :8080 | findstr LISTENING
# 如未运行:
# cd f:\Work\contest\Trae-create\mobile
# node update-server.js

# 4. 安装 Release APK（首次或原生模块变更时）
adb -s AXGY9X4110W00690 install -r android\app\build\outputs\apk\release\app-release.apk

# 5. 启动应用
adb -s AXGY9X4110W00690 shell am start -n com.mobile/.MainActivity

# 6. 修改代码后导出更新包
cd f:\Work\contest\Trae-create\mobile
npx expo export --platform android --output-dir dist

# 7. 重启应用触发热更新
adb -s AXGY9X4110W00690 shell am force-stop com.mobile
adb -s AXGY9X4110W00690 shell am start -n com.mobile/.MainActivity

# 8. 验证更新（等待 10 秒后）
Start-Sleep -Seconds 10
adb -s AXGY9X4110W00690 logcat -d | findstr /i "UpdateManager" | Select-Object -Last 10
```

### 10.5 真机调试注意事项

| 注意事项 | 说明 |
|----------|------|
| **原生模块变更需重新安装 APK** | 新增/修改 Android 原生模块（Java/Kotlin/SO/模型文件）不能热更新，必须 `adb install -r` 重新安装 |
| **首次安装需开启权限** | 首次安装打开时，手动授权「存储」「相机」等权限 |
| **USB 线质量** | 部分充电线只能充电不能传数据，确保使用数据线 |
| **华为设备特殊设置** | 手机管家 → 应用启动管理 → 找到应用 → 允许后台活动 |
| **设备休眠** | 调试时保持屏幕亮屏，避免系统休眠断开连接 |
| **真机性能** | 真机性能通常比模拟器好，动画和加载速度更快 |
