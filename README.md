# 🐕 Yuns桌面助手

<p align="center">
  <img src="assets/shiba.jpg" alt="Yuns桌面助手" width="150"/>
</p>

<p align="center">
  <b>智能桌面宠物 - 多模型AI对话助手 + MCP工具调用</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>
  <img src="https://img.shields.io/badge/Version-2.1.0-blue" alt="Version"/>
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows" alt="Platform"/>
</p>

---

## ✨ 功能特性

### 🤖 多模型AI对话
- **DeepSeek** - 支持 DeepSeek-V3.2 Chat 和 Reasoner 模型
- **Gemini** - 支持 Gemini 2.5 Pro/Flash 等全系列模型
- **OpenAI** - 支持 GPT-4o、GPT-4 Turbo 等模型
- **自定义** - 支持任何 OpenAI 兼容的 API 接口

### 👁️ 视觉分析
- 一键截屏并发送给AI分析
- 支持多模态视觉理解
- 自动隐藏窗口后截屏，确保截图干净

### 🛠️ MCP 工具调用 (新功能)
- 支持 Model Context Protocol (MCP) 标准
- 内置文件系统、终端命令、网络请求等预设
- AI 可自主调用工具完成复杂任务
- 支持自定义 MCP 服务器配置

### 🔄 Gemini API 中转站
- 内置 Gemini API 代理服务器
- 支持多 Key 轮询负载均衡
- 自动从 API 配置同步 Gemini Keys
- 方便在其他应用中使用 Gemini API

### 🎨 界面特性
- 🐕 可爱的桌面宠物形象
- 🌓 支持明暗主题切换
- 💬 流式输出，实时显示AI回复
- 📝 友好的提示消息系统
- 📄 对话导出为 Markdown 文件
- 🖼️ 响应式设计，窗口大小自适应

---

## 🖼️ 界面预览

| 桌面宠物 | 对话界面 | 设置界面 |
|:---:|:---:|:---:|
| 可爱柴犬桌宠 | 多模型智能对话 | 丰富配置选项 |

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/JianguSheng/yuns-desktop-pet.git
cd yuns-desktop-pet

# 2. 安装依赖
npm install

# 3. 启动应用
npm start

# 开发模式（带开发者工具）
npm run dev
```

### 构建可执行文件

```bash
# 构建 Windows 版本
npm run build

# 构建便携版
npm run build:portable
```

构建完成后，可执行文件位于 `dist/win-unpacked/` 目录。

---

## ⚙️ 配置说明

### API 配置

首次使用需要配置 AI 模型的 API：

1. 双击桌面宠物打开对话窗口
2. 点击右上角 **⚙️ 设置**
3. 在 **API 配置** 标签页添加或编辑配置
4. 填写 API 地址和密钥
5. 点击 **测试连接** 验证配置

#### 支持的 API 提供商

| 提供商 | 默认 API 地址 | 模型 |
|-------|-------------|-----|
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | deepseek-chat, deepseek-reasoner |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models` | gemini-2.5-pro, gemini-2.5-flash 等 |
| OpenAI | `https://api.openai.com/v1/chat/completions` | gpt-4o, gpt-4-turbo 等 |
| 自定义 | 自行配置 | 自定义模型 |

### MCP 工具配置

1. 进入 **设置** → **🛠️ MCP 工具**
2. 开启 **启用 MCP 工具调用**
3. 添加 MCP 服务器或使用预设：
   - 📁 **文件系统** - 文件读写操作
   - 💻 **终端命令** - 执行系统命令
   - 🌐 **网络请求** - HTTP 请求
4. 勾选 **启用此服务器** 并点击 **连接**

#### MCP 预设配置

```javascript
// 文件系统
command: npx
args: -y @modelcontextprotocol/server-filesystem C:/

// 终端命令
command: npx
args: -y @anthropics/mcp-server-shell

// 网络请求
command: npx
args: -y @anthropics/mcp-server-fetch
```

### Gemini 中转站配置

1. 进入 **设置** → **API 配置**（底部）
2. 开启中转站服务
3. 默认端口：`3001`
4. 访问地址：`http://localhost:3001/v1/chat/completions`

---

## 📁 项目结构

```
project/
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本
├── config.js            # 应用配置（模型、窗口等）
├── store.js             # 数据持久化
├── api-service.js       # AI API 调用服务
├── mcp-client.js        # MCP 客户端管理
├── proxy-server.js      # Gemini API 中转站
├── proxy-key-manager.js # API Key 管理
├── renderer/            # 渲染进程
│   ├── pet.html         # 桌宠窗口
│   ├── chat.html/js/css # 对话窗口
│   ├── settings.html/js/css # 设置窗口
│   └── friendly-messages.js # 友好提示
├── assets/              # 资源文件
│   ├── shiba.jpg        # 桌宠图片
│   └── icon.png         # 应用图标
└── dist/                # 构建输出
```

---

## 🔧 高级功能

### 对话保存

对话可以导出为 Markdown 文件：
- 点击对话界面的 **💾 保存** 按钮
- 默认保存路径可在 `config.js` 中配置

### 窗口置顶

在 **设置** → **通用设置** 中可开启窗口置顶功能。

### 宠物大小调节

在 **设置** → **外观设置** 中可调节宠物大小：
- 小：180x180
- 中：230x230（默认）
- 大：280x280

### 自定义主题

支持明暗主题切换，在 **外观设置** 中选择。

---

## 🛠️ 开发说明

### 开发模式

```bash
npm run dev
```

开发模式会自动打开开发者工具，方便调试。

### 菜单控制

```bash
# 隐藏菜单
npm run menu:hide

# 最小菜单
npm run menu:minimal

# 自定义菜单
npm run menu:custom
```

### 依赖说明

| 依赖 | 用途 |
|-----|-----|
| electron | 桌面应用框架 |
| axios | HTTP 请求 |
| electron-store | 数据持久化 |
| @modelcontextprotocol/sdk | MCP 协议支持 |
| express | 中转站服务器 |
| electron-builder | 应用打包 |

---

## 📋 更新日志

### v2.1.0 (2024-12)
- ✨ 新增 MCP 工具调用功能
- ✨ 新增 Gemini API 中转站
- 🐛 修复多项已知问题
- 💄 优化用户界面

### v2.0.0
- ✨ 多卡片配置系统
- ✨ 多模型支持
- ✨ 视觉分析功能
- ✨ 流式输出

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📞 联系方式

- **作者**: 匀升
- **邮箱**: 2644961476@qq.com
- **GitHub**: [JianguSheng](https://github.com/JianguSheng)
- **项目地址**: [yuns-desktop-pet](https://github.com/JianguSheng/yuns-desktop-pet)

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  Made with ❤️ by 匀升
</p>

