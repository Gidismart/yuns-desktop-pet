const { app, BrowserWindow, ipcMain, desktopCapturer, Menu, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const store = require('./store');
const apiService = require('./api-service');
const mcpClient = require('./mcp-client');
const proxyServer = require('./proxy-server');

let petWindow = null;
let chatWindow = null;
let settingsWindow = null;

// 获取应用图标路径（支持多种格式回退）
function getAppIcon() {
  const iconFormats = ['icon.png', 'icon.ico', 'icon.svg'];
  for (const format of iconFormats) {
    const iconPath = path.join(__dirname, 'assets', format);
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }
  return null; // 如果都不存在，返回 null，使用系统默认图标
}

// 宠物大小配置（放在顶部方便引用）
const petSizeConfig = {
  small: { width: 180, height: 180 },
  medium: { width: 230, height: 230 },
  large: { width: 280, height: 280 }
};

// 创建透明悬浮宠物窗口
function createPetWindow() {
  const alwaysOnTop = store.get('alwaysOnTop', false);
  const petSize = store.get('petSize', 'medium');
  const sizeConfig = petSizeConfig[petSize] || petSizeConfig.medium;
  const appIcon = getAppIcon();
  
  const options = {
    width: sizeConfig.width,
    height: sizeConfig.height,
    transparent: true,
    frame: false,
    alwaysOnTop: alwaysOnTop,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  };
  
  if (appIcon) {
    options.icon = appIcon;
  }
  
  petWindow = new BrowserWindow(options);

  // 定位到屏幕右下角
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const x = width - sizeConfig.width - 20; // 距离右边缘20px
  const y = height - sizeConfig.height - 20; // 距离底部20px
  petWindow.setPosition(x, y);

  petWindow.loadFile('renderer/pet.html');
  
  if (process.argv.includes('--dev')) {
    petWindow.webContents.openDevTools({ mode: 'detach' });
  }

  petWindow.on('closed', () => {
    petWindow = null;
    if (chatWindow) chatWindow.close();
    if (settingsWindow) settingsWindow.close();
  });
}

// 创建对话窗口
function createChatWindow() {
  if (chatWindow) {
    // 如果窗口被最小化，先恢复
    if (chatWindow.isMinimized()) {
      chatWindow.restore();
    }
    // 如果窗口不可见，显示它
    if (!chatWindow.isVisible()) {
      chatWindow.show();
    }
    chatWindow.focus();
    return;
  }

  const appIcon = getAppIcon();
  
  const options = {
    width: config.window.chatWidth,
    height: config.window.chatHeight,
    transparent: false,
    frame: true,
    alwaysOnTop: false,
    resizable: true,
    title: 'Yuns桌面助手 - 智能对话',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  };
  
  if (appIcon) {
    options.icon = appIcon;
  }
  
  chatWindow = new BrowserWindow(options);

  chatWindow.loadFile('renderer/chat.html');

  if (process.argv.includes('--dev')) {
    chatWindow.webContents.openDevTools({ mode: 'detach' });
  }

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

// 创建设置窗口
function createSettingsWindow() {
  if (settingsWindow) {
    // 如果窗口被最小化，先恢复
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    // 如果窗口不可见，显示它
    if (!settingsWindow.isVisible()) {
      settingsWindow.show();
    }
    settingsWindow.focus();
    return;
  }

  const appIcon = getAppIcon();
  
  const options = {
    width: config.window.settingsWidth,
    height: config.window.settingsHeight,
    transparent: false,
    frame: true,
    alwaysOnTop: false,
    resizable: true,
    title: 'Yuns桌面助手 - 设置',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  };
  
  if (appIcon) {
    options.icon = appIcon;
  }
  
  settingsWindow = new BrowserWindow(options);

  settingsWindow.loadFile('renderer/settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// 保存对话为Markdown
async function saveConversationAsMarkdown(conversation) {
  try {
    const savePath = config.markdown.savePath;
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `AI对话_${timestamp}.md`;
    const fullPath = path.join(savePath, filename);

    let markdownContent = '# AI对话记录\n\n';
    markdownContent += `> 创建时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    markdownContent += '---\n\n';

    conversation.forEach((item, index) => {
      markdownContent += `## Question ${index + 1}\n\n`;
      markdownContent += `${item.question}\n\n`;
      markdownContent += `## Answer ${index + 1}\n\n`;
      markdownContent += `模型：${item.model || 'Unknown'}\n\n`;
      markdownContent += `${item.answer}\n\n`;
      markdownContent += '---\n\n';
    });

    fs.writeFileSync(fullPath, markdownContent, 'utf-8');

    return {
      success: true,
      path: fullPath,
      filename: filename
    };
  } catch (error) {
    console.error('保存Markdown失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 截取屏幕（自动隐藏对话窗口和设置窗口）
async function captureScreen() {
  try {
    // 记录窗口状态
    const chatWasVisible = chatWindow && chatWindow.isVisible();
    const settingsWasVisible = settingsWindow && settingsWindow.isVisible();
    
    // 隐藏对话窗口和设置窗口
    if (chatWindow && chatWasVisible) {
      chatWindow.hide();
    }
    if (settingsWindow && settingsWasVisible) {
      settingsWindow.hide();
    }
    
    // 等待窗口完全隐藏（200ms延迟确保视觉效果）
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 截取屏幕
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    let result;
    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toPNG();
      const base64 = screenshot.toString('base64');
      
      result = {
        success: true,
        data: base64
      };
    } else {
      result = {
        success: false,
        error: '无法获取屏幕'
      };
    }
    
    // 恢复窗口显示（再等待100ms，让截图操作完全完成）
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (chatWindow && chatWasVisible) {
      chatWindow.show();
      chatWindow.focus();
    }
    if (settingsWindow && settingsWasVisible) {
      settingsWindow.show();
      settingsWindow.focus();
    }
    
    return result;
  } catch (error) {
    console.error('截屏失败:', error);
    
    // 发生错误时也要恢复窗口显示
    if (chatWindow && !chatWindow.isVisible()) {
      chatWindow.show();
    }
    if (settingsWindow && !settingsWindow.isVisible()) {
      settingsWindow.show();
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// IPC通信处理
ipcMain.on('open-chat', () => {
  createChatWindow();
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.handle('send-message', async (event, { messages }) => {
  return await apiService.sendMessage(messages);
});

ipcMain.handle('save-conversation', async (event, { conversation }) => {
  return await saveConversationAsMarkdown(conversation);
});

ipcMain.handle('capture-screen', async () => {
  return await captureScreen();
});

ipcMain.handle('analyze-screenshot', async (event, { base64Image }) => {
  return await apiService.analyzeScreenshot(base64Image);
});

// 测试 API 配置
ipcMain.handle('test-api-config', async (event, { apiConfig }) => {
  return await apiService.testConnection(apiConfig);
});

// 配置管理
ipcMain.handle('get-config', () => {
  return config;
});

ipcMain.handle('get-api-configs', () => {
  return store.get('apiConfigs', []);
});

ipcMain.handle('get-active-config', () => {
  return store.getActiveConfig();
});

ipcMain.handle('add-api-config', (event, { config: newConfig }) => {
  return store.addConfig(newConfig);
});

ipcMain.handle('update-api-config', (event, { id, updates }) => {
  return store.updateConfig(id, updates);
});

ipcMain.handle('delete-api-config', (event, { id }) => {
  store.deleteConfig(id);
  return { success: true };
});

ipcMain.handle('set-active-config', (event, { id }) => {
  return store.setActiveConfig(id);
});

// Store 相关
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
  
  if (key === 'alwaysOnTop' && petWindow) {
    petWindow.setAlwaysOnTop(value);
  }
  
  return true;
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
  return true;
});

// ========== 主题相关 IPC 处理 ==========

// 广播主题变化到所有窗口
ipcMain.on('theme-changed', (event, isDarkMode) => {
  // 广播到所有窗口
  const windows = [petWindow, chatWindow, settingsWindow];
  windows.forEach(win => {
    if (win && !win.isDestroyed() && win.webContents !== event.sender) {
      win.webContents.send('theme-changed', isDarkMode);
    }
  });
});

// ========== 宠物相关 IPC 处理 ==========

// 宠物图片大小配置（与窗口大小对应）
const petImageSizes = { small: 150, medium: 200, large: 250 };

// 更新宠物图片
ipcMain.on('update-pet-image', (event, imagePath) => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet-image-updated', imagePath);
  }
});

// 更新宠物大小
ipcMain.on('update-pet-size', (event, size) => {
  if (petWindow && !petWindow.isDestroyed()) {
    const windowSize = petSizeConfig[size] || petSizeConfig.medium;
    const imageSize = petImageSizes[size] || petImageSizes.medium;
    petWindow.setSize(windowSize.width, windowSize.height);
    petWindow.webContents.send('pet-size-updated', imageSize);
  }
});

// ========== 对话界面设置 IPC 处理 ==========

// 更新聊天主题色
ipcMain.on('update-chat-theme', (event, theme) => {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.webContents.send('chat-theme-updated', theme);
  }
});

// 更新聊天字体大小
ipcMain.on('update-chat-font-size', (event, fontSize) => {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.webContents.send('chat-font-size-updated', fontSize);
  }
});

// ========== 文件/目录选择 IPC 处理 ==========

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择 Markdown 保存路径'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, path: result.filePaths[0] };
  }
  return { success: false };
});

// ========== MCP 相关 IPC 处理 ==========

// 获取 MCP 服务器列表
ipcMain.handle('get-mcp-servers', () => {
  return store.getMcpServers();
});

// 添加 MCP 服务器
ipcMain.handle('add-mcp-server', (event, { serverConfig }) => {
  return store.addMcpServer(serverConfig);
});

// 更新 MCP 服务器
ipcMain.handle('update-mcp-server', (event, { id, updates }) => {
  return store.updateMcpServer(id, updates);
});

// 删除 MCP 服务器
ipcMain.handle('delete-mcp-server', (event, { id }) => {
  store.deleteMcpServer(id);
  return { success: true };
});

// 连接 MCP 服务器
ipcMain.handle('connect-mcp-server', async (event, { serverConfig }) => {
  return await mcpClient.connectServer(serverConfig);
});

// 断开 MCP 服务器
ipcMain.handle('disconnect-mcp-server', async (event, { serverId }) => {
  return await mcpClient.disconnectServer(serverId);
});

// 获取已连接的 MCP 服务器
ipcMain.handle('get-connected-mcp-servers', () => {
  return mcpClient.getConnectedServers();
});

// 获取所有可用的工具
ipcMain.handle('get-mcp-tools', () => {
  return mcpClient.allTools;
});

// 切换 MCP 功能
ipcMain.handle('toggle-mcp', (event, { enabled }) => {
  store.set('mcpEnabled', enabled);
  return { success: true };
});

// 发送消息（带工具调用支持）
ipcMain.handle('send-message-with-tools', async (event, { messages }) => {
  return await apiService.sendMessageWithTools(messages, (toolCall) => {
    // 将工具调用进度发送到渲染进程
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('tool-call-update', toolCall);
    }
  });
});

// ========== Gemini API 中转站相关 IPC 处理 ==========

// 获取中转站配置
ipcMain.handle('get-proxy-config', () => {
  return store.getProxyConfig();
});

// 获取所有 Gemini Keys（包括 API 配置中同步的）
ipcMain.handle('get-all-gemini-keys', () => {
  return store.getAllGeminiKeys();
});

// 启动中转站
ipcMain.handle('start-proxy-server', () => {
  try {
    const proxyConfig = store.getProxyConfig();
    const allKeys = store.getAllGeminiKeys();
    
    if (allKeys.length === 0) {
      return { success: false, error: '没有可用的 Gemini API Key，请先在 API 配置中添加 Gemini 配置' };
    }
    
    proxyServer.start(allKeys, proxyConfig.port || 3001);
    store.setProxyEnabled(true);
    return { success: true, port: proxyConfig.port || 3001, keyCount: allKeys.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 停止中转站
ipcMain.handle('stop-proxy-server', () => {
  try {
    proxyServer.stop();
    store.setProxyEnabled(false);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取中转站状态
ipcMain.handle('get-proxy-status', () => {
  return proxyServer.getStatus();
});

// 添加额外的 Gemini Key（手动添加）
ipcMain.handle('add-proxy-key', (event, { key }) => {
  const keyObj = store.addProxyKey(key);
  // 如果中转站正在运行，重新加载 Keys
  if (proxyServer.isRunning) {
    proxyServer.reloadKeys(store.getAllGeminiKeys());
  }
  return { success: true, key: keyObj };
});

// 删除手动添加的 Key
ipcMain.handle('remove-proxy-key', (event, { keyId }) => {
  store.removeProxyKey(keyId);
  // 如果中转站正在运行，重新加载 Keys
  if (proxyServer.isRunning) {
    proxyServer.reloadKeys(store.getAllGeminiKeys());
  }
  return { success: true };
});

// 切换 Key 启用状态
ipcMain.handle('toggle-proxy-key', (event, { keyId, enabled }) => {
  store.toggleProxyKey(keyId, enabled);
  // 如果中转站正在运行，重新加载 Keys
  if (proxyServer.isRunning) {
    proxyServer.reloadKeys(store.getAllGeminiKeys());
  }
  return { success: true };
});

// 设置中转站端口
ipcMain.handle('set-proxy-port', (event, { port }) => {
  store.setProxyPort(port);
  return { success: true };
});

// 设置是否自动同步 API 配置
ipcMain.handle('set-auto-sync-api-configs', (event, { enabled }) => {
  store.setAutoSyncApiConfigs(enabled);
  // 如果中转站正在运行，重新加载 Keys
  if (proxyServer.isRunning) {
    proxyServer.reloadKeys(store.getAllGeminiKeys());
  }
  return { success: true };
});

// 刷新中转站 Keys（当 API 配置变化时调用）
ipcMain.handle('refresh-proxy-keys', () => {
  if (proxyServer.isRunning) {
    proxyServer.reloadKeys(store.getAllGeminiKeys());
  }
  return { success: true };
});

// 创建自定义菜单
function createCustomMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // macOS 需要应用菜单
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: '关于', role: 'about' },
        { type: 'separator' },
        { label: '设置', click: () => { if (settingsWindow) settingsWindow.show(); else createSettingsWindow(); } },
        { type: 'separator' },
        { label: '隐藏', role: 'hide' },
        { label: '隐藏其他', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    }] : []),
    // 文件菜单
    {
      label: '文件',
      submenu: [
        { label: '设置', click: () => { if (settingsWindow) settingsWindow.show(); else createSettingsWindow(); } },
        { type: 'separator' },
        isMac ? { label: '关闭窗口', role: 'close' } : { label: '退出', role: 'quit' }
      ]
    },
    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '删除', role: 'delete' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    // 视图菜单
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    // 窗口菜单
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '缩放', role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { label: '前置所有窗口', role: 'front' },
          { type: 'separator' },
          { label: '窗口', role: 'window' }
        ] : [
          { label: '关闭', role: 'close' }
        ])
      ]
    },
    // 帮助菜单
    {
      label: '帮助',
      submenu: [
        {
          label: '查看文档',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/');
          }
        },
        { type: 'separator' },
        { label: '关于 Yuns桌面助手', click: () => showAboutDialog() }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 关于对话框
function showAboutDialog() {
  const { dialog } = require('electron');
  dialog.showMessageBox({
    type: 'info',
    title: '关于 Yuns桌面助手',
    message: 'Yuns桌面助手',
    detail: `版本: 2.0.0\n作者: 齐匀升\n\n一个智能的桌面AI助手，支持多模型对话和屏幕视觉分析。`,
    buttons: ['确定']
  });
}

// 应用生命周期
app.whenReady().then(async () => {
  // 创建自定义菜单（如果想隐藏菜单，注释这一行）
  createCustomMenu();
  
  // 如果想完全隐藏菜单栏，取消下面这行的注释：
  // Menu.setApplicationMenu(null);
  
  createPetWindow();

  // 自动启动中转站（如果已启用）
  const proxyConfig = store.getProxyConfig();
  if (proxyConfig.enabled) {
    const allKeys = store.getAllGeminiKeys();
    if (allKeys.length > 0) {
      console.log('🚀 自动启动 Gemini API 中转站...');
      proxyServer.start(allKeys, proxyConfig.port || 3001);
    } else {
      console.log('⚠️ 中转站已启用但没有可用的 Gemini Key');
    }
  }

  // 自动连接已启用的 MCP 服务器
  const mcpEnabled = store.get('mcpEnabled', false);
  if (mcpEnabled) {
    console.log('🛠️ MCP 功能已启用，正在自动连接服务器...');
    try {
      await mcpClient.initializeFromConfig();
      const connectedServers = mcpClient.getConnectedServers();
      console.log(`✅ 已自动连接 ${connectedServers.length} 个 MCP 服务器`);
    } catch (error) {
      console.error('❌ MCP 自动连接失败:', error.message);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPetWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出时清理
app.on('before-quit', async () => {
  // 停止中转站
  proxyServer.stop();
  
  // 断开所有 MCP 连接
  try {
    await mcpClient.closeAll();
    console.log('🛠️ 已断开所有 MCP 连接');
  } catch (error) {
    console.error('MCP 断开失败:', error.message);
  }
  
  console.log('👋 应用正在退出...');
});
