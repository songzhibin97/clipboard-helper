# Electron Clipboard

Electron Clipboard 是一款轻量级的 macOS 剪贴板历史管理工具，帮助用户记录、查看和快速复用剪贴板内容。它支持应用图标显示、置顶窗口、快捷键呼出等功能，适合日常工作和开发场景。

## 功能特性

- **剪贴板历史记录**：
  - 自动记录文本剪贴板内容（最多 100 条）
  - 显示来源应用名和图标（支持常见应用，如 Safari、WeChat、TextEdit 等）
  - 从本应用复制时保留原始来源（不显示 Electron）

- **搜索与管理**：
  - 支持关键字搜索历史记录
  - 一键清空历史
  - 点击记录快速复制，带提示反馈

- **窗口控制**：
  - 置顶窗口（📍 按钮）
  - 失去焦点自动隐藏（可设置）
  - 快捷键呼出（默认 `Cmd+Shift+V`，可自定义）

- **系统托盘**：
  - 自定义托盘图标（`assets/tray-icon.png`）或默认文本图标
  - 右键菜单控制显示/隐藏、置顶、退出

- **可靠图标显示**：
  - 优先加载应用 `.icns` 图标，失败时生成文本图标（基于应用名）
  - 无"图裂"现象（空白或错误图标）

## 安装

1. **克隆仓库**：
   ```bash
   git clone <repository-url>
   cd electron-clipboard
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **（可选）设置托盘图标**：
   - 将 16x16 或 32x32 像素的 `tray-icon.png` 放入 `assets/` 目录
   - 运行 `make create-icon` 检查

4. **启动应用**：
   ```bash
   npm start
   ```

## 使用方法

1. **复制内容**：
   - 从任意应用（WeChat、Safari 等）复制文本，自动记录到历史
   - 本应用复制（点击历史项）保留原始来源

2. **查看历史**：
   - 按 `Cmd+Shift+V`（或托盘图标点击）打开窗口
   - 使用搜索栏过滤记录

3. **管理记录**：
   - 点击记录复制内容
   - 点击"清空历史"删除所有记录

4. **窗口设置**：
   - 点击 📍 置顶窗口
   - 点击 ⚙️ 进入设置：
     - 切换"自动隐藏"
     - 修改快捷键（例如 `CommandOrControl+Shift+V`）

5. **退出**：
   - 托盘右键菜单选择"退出"

## 项目结构

```
.
├── assets/
│   └── tray-icon.png (可选，托盘图标)
├── index.html        (前端界面)
├── main.js           (主进程：剪贴板监听、图标加载)
├── preload.js        (上下文桥接)
├── package.json      (依赖和构建配置)
├── Makefile          (辅助命令)
└── README.md
```

## 开发与调试

1. **运行开发模式**：
   ```bash
   npm start
   ```

2. **打包应用**：
   ```bash
   npm run dist
   ```

3. **调试**：
   - 打开开发者工具（`Cmd+Option+I`）
   - 检查控制台日志：
     - 剪贴板变化：`检测到剪贴板变化`
     - 图标加载：`成功生成图标` 或 `使用文本图标`
     - 来源保留：`从本应用复制，保留原始 source`

4. **常见问题**：
   - **图标空白**：确认应用路径（`/Applications`），检查日志（"获取图标失败"）
   - **记录缺失**：验证剪贴板权限（系统设置 > 隐私与安全 > 剪贴板）
   - **快捷键失效**：检查设置中快捷键配置

## 依赖

- **Electron**: `^31.3.1`（跨平台桌面应用框架）
- **electron-store**: `^8.2.0`（存储历史和设置）
- **applescript**: `^1.0.0`（获取应用路径和名称）

## 构建

```bash
make pack    # 打包未签名应用
make dist    # 构建完整分发包
```

## 注意事项

- **macOS 权限**：确保应用有剪贴板访问权限
- **图标支持**：部分应用（如 WeChat）的 `.icns` 可能非标，自动回退到文本图标
- **性能**：剪贴板监听使用非轮询方式（500ms 间隔），低 CPU 占用

## 贡献

欢迎提交 Issue 或 PR！请提供：
- 问题描述（日志、截图）
- 复现步骤（例如"复制 WeChat 文本后..."）
- macOS 版本

## 许可证

ISC License