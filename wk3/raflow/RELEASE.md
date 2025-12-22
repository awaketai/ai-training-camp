# RAFlow 发布流程文档

## 版本信息

| 项目 | 内容 |
|-----|------|
| 文档版本 | 1.0 |
| 创建日期 | 2025-12-22 |
| 最后更新 | 2025-12-22 |
| 维护者 | RAFlow Team |

## 目录

- [1. 发布前准备](#1-发布前准备)
- [2. 构建流程](#2-构建流程)
- [3. 测试验证](#3-测试验证)
- [4. 代码签名](#4-代码签名)
- [5. 公证流程](#5-公证流程)
- [6. 发布到GitHub](#6-发布到github)
- [7. 问题排查](#7-问题排查)

---

## 1. 发布前准备

### 1.1 版本号更新

更新以下文件中的版本号：

1. **package.json**
```json
{
  "version": "x.y.z"
}
```

2. **src-tauri/Cargo.toml**
```toml
[package]
version = "x.y.z"
```

3. **src-tauri/tauri.conf.json**
```json
{
  "version": "x.y.z"
}
```

### 1.2 更新 CHANGELOG

创建或更新 `CHANGELOG.md`:

```markdown
## [x.y.z] - YYYY-MM-DD

### Added
- 新功能描述

### Changed
- 变更说明

### Fixed
- 修复的问题

### Removed
- 移除的功能
```

### 1.3 代码审查清单

- [ ] 所有功能已完成并测试
- [ ] 代码已通过 lint 检查
- [ ] 文档已更新
- [ ] 没有调试代码和 console.log
- [ ] 没有硬编码的凭证
- [ ] 性能测试通过
- [ ] 已测试降级场景

### 1.4 依赖检查

```bash
# 检查过时的依赖
cd wk3/raflow
pnpm outdated

# 检查安全漏洞
pnpm audit
cd src-tauri && cargo audit
```

---

## 2. 构建流程

### 2.1 使用自动化脚本

最简单的方式是使用提供的构建脚本：

```bash
cd /path/to/geek-camp
./wk3/scripts/build-release.sh
```

脚本会自动执行：
1. 清理旧构建
2. 运行所有测试
3. 执行代码质量检查
4. 构建发布版本
5. 验证构建产物
6. 生成校验和

### 2.2 手动构建

如果需要更细粒度的控制：

```bash
# 1. 清理
make -C wk3 clean

# 2. 运行测试
make -C wk3 test

# 3. 代码检查
make -C wk3 check
make -C wk3 lint

# 4. 构建
make -C wk3 release
```

### 2.3 构建产物

构建完成后，产物位于：

- **macOS App**: `wk3/raflow/src-tauri/target/release/bundle/macos/RAFlow.app`
- **DMG 安装包**: `wk3/raflow/src-tauri/target/release/bundle/dmg/RAFlow_*.dmg`

---

## 3. 测试验证

### 3.1 自动化测试

```bash
# 运行所有测试
cd wk3/raflow/src-tauri
cargo test --all

# 单元测试
cargo test --lib

# 集成测试
cargo test --test integration_tests

# 性能测试
cargo test --release --test performance_tests -- --nocapture
```

### 3.2 手动测试清单

#### 基础功能测试

- [ ] 应用启动正常
- [ ] 托盘图标显示正确
- [ ] 设置面板可以打开
- [ ] API Key 可以保存

#### 音频功能测试

- [ ] 可以列出音频设备
- [ ] 可以选择音频设备
- [ ] 音频采集正常
- [ ] 音频波形显示正常

#### 转写功能测试

- [ ] WebSocket 连接成功
- [ ] 实时转写显示正确
- [ ] 部分转写更新及时
- [ ] 最终转写准确

#### 文本注入测试

在以下应用中测试文本注入：

- [ ] Chrome/Safari (使用剪贴板)
- [ ] TextEdit (使用剪贴板)
- [ ] Terminal (使用键盘)
- [ ] VS Code (使用键盘)
- [ ] Notes (使用剪贴板)

#### 权限测试

- [ ] 麦克风权限检测正确
- [ ] 辅助功能权限检测正确
- [ ] 权限请求流程正常
- [ ] 权限拒绝时提示清晰

#### 性能测试

- [ ] CPU 占用 < 10%
- [ ] 内存占用 < 100MB
- [ ] 长时间运行稳定（30分钟+）
- [ ] 无明显内存泄漏

#### 错误处理测试

- [ ] 网络断开时正确重连
- [ ] 音频设备断开时正确处理
- [ ] 无效 API Key 时正确提示
- [ ] 权限不足时正确提示

---

## 4. 代码签名

### 4.1 前置条件

1. **Apple Developer 账号**
   - 已注册开发者账号
   - 已支付年费

2. **证书**
   - "Developer ID Application" 证书
   - 已安装到钥匙串

3. **查看可用证书**
```bash
security find-identity -v -p codesigning
```

### 4.2 签名流程

#### 使用脚本签名

```bash
export SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
./wk3/scripts/build-release.sh
```

#### 手动签名

```bash
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --options runtime \
  wk3/raflow/src-tauri/target/release/bundle/macos/RAFlow.app
```

### 4.3 验证签名

```bash
# 验证签名
codesign --verify --deep --strict --verbose=2 \
  wk3/raflow/src-tauri/target/release/bundle/macos/RAFlow.app

# 查看签名信息
codesign -dv --verbose=4 \
  wk3/raflow/src-tauri/target/release/bundle/macos/RAFlow.app
```

---

## 5. 公证流程

### 5.1 前置条件

1. **App-Specific Password**
   - 前往 https://appleid.apple.com
   - 生成 App 专用密码

2. **环境变量**
```bash
export APPLE_ID="your-email@example.com"
export TEAM_ID="YOUR_TEAM_ID"
export APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App专用密码
```

### 5.2 提交公证

```bash
# 找到 DMG 文件
DMG_PATH="wk3/raflow/src-tauri/target/release/bundle/dmg/RAFlow_*.dmg"

# 提交公证
xcrun notarytool submit "$DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD" \
  --wait
```

### 5.3 检查公证状态

```bash
# 列出所有提交
xcrun notarytool history \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD"

# 查看具体提交的日志
xcrun notarytool log <submission-id> \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD"
```

### 5.4 装订公证票据

公证成功后，将票据装订到 DMG：

```bash
xcrun stapler staple "$DMG_PATH"

# 验证装订
xcrun stapler validate "$DMG_PATH"
```

---

## 6. 发布到 GitHub

### 6.1 创建 Git Tag

```bash
# 创建标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 推送标签
git push origin v1.0.0
```

### 6.2 创建 GitHub Release

1. **访问 GitHub Releases 页面**
   ```
   https://github.com/YOUR_USERNAME/raflow/releases/new
   ```

2. **填写信息**
   - Tag: v1.0.0
   - Title: RAFlow v1.0.0
   - Description: 从 CHANGELOG.md 复制内容

3. **上传文件**
   - `RAFlow_1.0.0_universal.dmg`
   - `RAFlow_1.0.0_universal.dmg.sha256`

4. **发布**
   - 选择 "Publish release"

### 6.3 Release Notes 模板

```markdown
## RAFlow v1.0.0

### ✨ 新功能

- 实时语音转写
- 智能文本注入
- 性能监控

### 🐛 问题修复

- 修复音频采集问题
- 修复内存泄漏

### 📦 下载

#### macOS (Universal Binary)

- [RAFlow_1.0.0_universal.dmg](链接)
- SHA256: `xxx...`

#### 系统要求

- macOS 11.0 (Big Sur) 或更高版本
- 支持 Apple Silicon 和 Intel 处理器

#### 安装说明

1. 下载 DMG 文件
2. 双击打开
3. 将 RAFlow 拖到 Applications 文件夹
4. 首次运行时，按 Ctrl+右键点击，选择"打开"

### 📝 完整更新日志

查看 [CHANGELOG.md](链接) 获取详细更新内容。
```

---

## 7. 问题排查

### 7.1 构建失败

**问题**: 编译错误

**解决**:
```bash
# 清理并重新构建
cargo clean
pnpm tauri build
```

**问题**: 依赖冲突

**解决**:
```bash
# 更新依赖
cargo update
pnpm install
```

### 7.2 签名失败

**问题**: "Developer ID Application" certificate not found

**解决**:
```bash
# 查看可用证书
security find-identity -v -p codesigning

# 确保证书已导入钥匙串
# 可能需要重新下载并安装证书
```

**问题**: signing identity is not valid

**解决**:
- 确认证书未过期
- 确认证书类型正确（Developer ID Application）
- 确认 TEAM_ID 正确

### 7.3 公证失败

**问题**: Invalid Signature

**解决**:
- 确保应用已签名
- 使用 `--options runtime` 签名
- 检查所有二进制文件都已签名

**问题**: Asset validation failed

**解决**:
```bash
# 查看详细日志
xcrun notarytool log <submission-id> \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD"
```

**问题**: Authentication failed

**解决**:
- 确认 App-Specific Password 正确
- 确认 Apple ID 和 Team ID 正确
- 确认账号已支付开发者费用

### 7.4 安装失败

**问题**: "App is damaged and can't be opened"

**解决**:
- 确保 DMG 已签名和公证
- 用户需要右键点击选择"打开"
- 或运行: `xattr -cr /Applications/RAFlow.app`

**问题**: "App can't be opened because it is from an unidentified developer"

**解决**:
- 确保应用已签名
- 确保应用已公证
- 用户需要在"安全性与隐私"中允许

---

## 8. 检查清单

### 发布前检查

- [ ] 版本号已更新（3个文件）
- [ ] CHANGELOG 已更新
- [ ] 所有测试通过
- [ ] 代码质量检查通过
- [ ] 手动测试完成
- [ ] 文档已更新

### 构建检查

- [ ] 清理旧构建
- [ ] Release 模式构建
- [ ] 构建产物存在
- [ ] 校验和已生成

### 签名和公证检查

- [ ] 应用已签名
- [ ] 签名已验证
- [ ] 公证已提交
- [ ] 公证已通过
- [ ] 票据已装订

### 发布检查

- [ ] Git tag 已创建
- [ ] Git tag 已推送
- [ ] GitHub Release 已创建
- [ ] 文件已上传
- [ ] Release Notes 已填写

### 发布后检查

- [ ] 下载链接可用
- [ ] 用户可以正常安装
- [ ] 应用可以正常运行
- [ ] 监控用户反馈

---

## 9. 紧急回滚流程

如果发布后发现严重问题：

1. **立即隐藏 Release**
   - 在 GitHub Releases 页面设为 Draft

2. **发布公告**
   - 在 README 添加警告
   - 在 Issues 创建跟踪问题

3. **修复问题**
   - 在新分支修复
   - 运行所有测试

4. **发布补丁版本**
   - 版本号递增（如 1.0.0 → 1.0.1）
   - 跟随完整发布流程

---

## 10. 联系方式

- **问题报告**: GitHub Issues
- **讨论**: GitHub Discussions
- **邮件**: [待填写]

---

**文档状态**: ✅ 已完成
**最后更新**: 2025-12-22
**维护者**: RAFlow Team
